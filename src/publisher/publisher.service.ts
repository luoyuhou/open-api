import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntity } from '../users/entities/user.entity';
import { PUBLISHER_PLATFORMS, PublisherPlatformSeed } from './publisher.const';
import { PublisherMediaService } from './publisher-media.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { PublishArticleDto } from './dto/publish.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import {
  CreateAlqqCredentialDto,
  UpdateAlqqCredentialDto,
} from './dto/upsert-alqq-credential.dto';
import { CreatePublishPlatformDto } from './dto/create-publish-platform.dto';
import { UpdatePublishPlatformDto } from './dto/update-publish-platform.dto';
import { AlqqSession } from './alqq.client';
import { decryptSecret, encryptSecret, maskSecret } from './alqq-crypto';
import customLogger from '../common/logger';
import Env from '../common/const/Env';
import { toHttpsUrl } from '../common/utils/url';
import { EUSER_AUTH_STATUS } from '../auth/role-management/const';

type PublishTarget = {
  platformId: string;
  platformName: string;
  accountId: string | null;
  bound: boolean;
  status: 'queued' | 'success' | 'skipped' | 'failed';
  message: string;
  alqqBatchId?: string;
  alqqLogId?: string;
  publishUrl?: string;
  platformPublicUrl?: string;
  platformStatus?: string;
  /** 阅读量；ALQQ 未回传时为 null */
  readCount?: number | null;
  /** 互动量（赞评转等合计，或平台直接给的互动数） */
  interactCount?: number | null;
  statsUpdatedAt?: number | null;
  /** 已向 ALQQ 内容排行查询过（避免每次打开都请求） */
  statsCheckedAt?: number | null;
};

@Injectable()
export class PublisherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: PublisherMediaService,
  ) {}

  async uploadCover(
    user: UserEntity,
    file?: Express.Multer.File,
    options: { articleId?: string; replaceUrl?: string } = {},
  ) {
    const articleId = (options.articleId || '').trim();
    if (articleId) {
      await this.getArticleRow(user, articleId);
    }

    const replaceUrl = (options.replaceUrl || '').trim();
    if (replaceUrl) {
      await this.media.releaseUrl(
        user.user_id,
        articleId || undefined,
        replaceUrl,
      );
    }

    const { url, hash } = await this.media.uploadForUser(
      user.user_id,
      file as any,
    );
    const httpsUrl = toHttpsUrl(url);

    if (articleId) {
      await this.media.attachAsset(user.user_id, articleId, hash, httpsUrl);
    }

    return { url: httpsUrl };
  }

  async syncArticleMedia(
    user: UserEntity,
    articleId: string,
    cover?: string,
    content?: string,
  ) {
    const row = await this.getArticleRow(user, articleId);
    await this.media.syncArticleAssets(
      user.user_id,
      articleId,
      cover !== undefined ? cover : row.cover,
      content !== undefined ? content : row.content,
    );
    return { ok: true };
  }

  private alqqCred(): any {
    return (this.prisma as any).user_alqq_credential;
  }

  private platAcc(): any {
    return (this.prisma as any).content_platform_account;
  }

  private platCatalog(): any {
    return (this.prisma as any).content_publish_platform;
  }

  private newId(prefix: string) {
    return `${prefix}_${Date.now()}_${uuidv4().slice(0, 8)}`;
  }

  private mapCatalogRow(row: {
    platform_id: string;
    name: string;
    color: string;
    login_url: string;
    hint: string;
    enabled: boolean;
    sort: number;
  }) {
    return {
      id: row.platform_id,
      name: row.name,
      color: row.color || '#8A847A',
      loginUrl: row.login_url || '',
      hint: row.hint || '',
      enabled: !!row.enabled,
      sort: row.sort ?? 100,
    };
  }

  private async ensurePlatformCatalog() {
    const existing = await this.platCatalog().findMany({
      select: { platform_id: true },
    });
    const have = new Set(
      existing.map((row: { platform_id: string }) => row.platform_id),
    );
    // 增量补齐 seed，不覆盖管理端已改过的名称/上下线
    for (const p of PUBLISHER_PLATFORMS as readonly PublisherPlatformSeed[]) {
      if (have.has(p.id)) continue;
      await this.platCatalog().create({
        data: {
          platform_id: p.id,
          name: p.name,
          color: p.color,
          login_url: p.loginUrl || '',
          hint: p.hint || '',
          enabled: p.enabled !== false,
          sort: p.sort ?? 100,
        },
      });
    }
  }

  private async listCatalogRows(onlyEnabled?: boolean) {
    await this.ensurePlatformCatalog();
    return this.platCatalog().findMany({
      where: onlyEnabled ? { enabled: true } : undefined,
      orderBy: [{ sort: 'asc' }, { platform_id: 'asc' }],
    });
  }

  private async getCatalogMap(includeDisabled = true) {
    const rows = await this.listCatalogRows(!includeDisabled);
    const map = new Map<
      string,
      ReturnType<PublisherService['mapCatalogRow']>
    >();
    for (const row of rows) {
      map.set(row.platform_id, this.mapCatalogRow(row));
    }
    return map;
  }

  private async assertAdmin(user: UserEntity) {
    const userAuth = await this.prisma.user_auth.findFirst({
      where: { user_id: user.user_id, status: EUSER_AUTH_STATUS.active },
    });
    if (!userAuth || !userAuth.is_admin) {
      throw new ForbiddenException('仅后台管理者可操作发文平台目录');
    }
  }

  private parsePlatforms(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private mapArticle(row: {
    article_id: string;
    title: string;
    content: string;
    digest: string;
    cover: string | null;
    status: string;
    platforms: string;
    create_date: Date | null;
    update_date: Date | null;
  }) {
    return {
      id: row.article_id,
      title: row.title,
      content: row.content,
      digest: row.digest,
      cover: row.cover || '',
      status: row.status,
      platforms: this.parsePlatforms(row.platforms),
      createdAt: row.create_date ? row.create_date.getTime() : Date.now(),
      updatedAt: row.update_date ? row.update_date.getTime() : Date.now(),
    };
  }

  private async getArticleRow(user: UserEntity, articleId: string) {
    const row = await this.prisma.content_article.findFirst({
      where: { article_id: articleId, user_id: user.user_id },
    });
    if (!row) {
      throw new NotFoundException('文章不存在');
    }
    return row;
  }

  private async latestJobRow(user: UserEntity, articleId: string) {
    return this.prisma.content_publish_job.findFirst({
      where: { user_id: user.user_id, article_id: articleId },
      orderBy: { create_date: 'desc' },
    });
  }

  private withPublishState(
    article: ReturnType<PublisherService['mapArticle']>,
    job?: ReturnType<PublisherService['mapJob']> | null,
  ) {
    const targets = job?.targets || [];
    const pending = targets.some((item) => item.status === 'queued');
    const canRefresh = job?.status === 'running' && pending;
    return {
      ...article,
      publishJobId: job?.id || '',
      publishTargets: targets,
      canRefresh,
    };
  }

  private async enrichArticles(
    user: UserEntity,
    articles: Array<ReturnType<PublisherService['mapArticle']>>,
  ) {
    if (!articles.length) return articles;
    const rows = await this.prisma.content_publish_job.findMany({
      where: {
        user_id: user.user_id,
        article_id: { in: articles.map((item) => item.id) },
      },
      orderBy: { create_date: 'desc' },
    });
    const latest = new Map<string, ReturnType<PublisherService['mapJob']>>();
    for (const row of rows) {
      if (!latest.has(row.article_id)) {
        latest.set(row.article_id, this.mapJob(row));
      }
    }
    return articles.map((article) =>
      this.withPublishState(article, latest.get(article.id)),
    );
  }

  private isTargetPending(status: string) {
    return status === 'queued';
  }

  private articleStatusFromTargets(
    mode: string,
    targets: PublishTarget[],
    deferred = false,
  ) {
    if (deferred) return 'draft';
    if (targets.some((item) => this.isTargetPending(item.status))) {
      return 'publishing';
    }
    if (
      mode === 'publish' &&
      targets.some((item) => item.status === 'success')
    ) {
      return 'published';
    }
    return 'draft';
  }

  private mapAccount(
    row: {
      account_id: string;
      platform_id: string;
      account_name: string;
      bound: boolean;
      external_id?: string | null;
      bind_status?: string | null;
      last_sync_at?: Date | null;
      alqq_credential_id?: string | null;
    },
    catalog?: ReturnType<PublisherService['mapCatalogRow']> | null,
  ) {
    const seed = PUBLISHER_PLATFORMS.find((p) => p.id === row.platform_id) as
      | PublisherPlatformSeed
      | undefined;
    const meta = catalog || seed;
    const bindStatus = row.bound ? 'bound' : row.bind_status || 'unbound';
    return {
      id: row.account_id,
      platformId: row.platform_id,
      platformName: meta?.name || row.platform_id,
      accountName: row.account_name,
      bound: row.bound,
      color: meta?.color || '#8A847A',
      bindStatus,
      externalId: row.external_id || '',
      lastSyncAt: row.last_sync_at ? row.last_sync_at.getTime() : null,
      loginUrl: catalog?.loginUrl || seed?.loginUrl || '',
      hint: catalog?.hint || seed?.hint || '',
      enabled: catalog
        ? catalog.enabled
        : seed
        ? seed.enabled !== false
        : false,
      alqqUrl: `${Env.ALQQ_API_BASE.replace(/\/$/, '')}/`,
      credentialId: row.alqq_credential_id || '',
    };
  }

  private alqqBaseUrl() {
    return Env.ALQQ_API_BASE.replace(/\/$/, '');
  }

  private mapAlqqCredential(row: {
    credential_id: string;
    name: string;
    is_default: boolean;
    api_key_hint: string;
    last_verified_at: Date | null;
  }) {
    return {
      id: row.credential_id,
      name: row.name,
      isDefault: !!row.is_default,
      hint: row.api_key_hint || '',
      lastVerifiedAt: row.last_verified_at
        ? row.last_verified_at.getTime()
        : null,
    };
  }

  private async listAlqqRows(user: UserEntity) {
    return this.alqqCred().findMany({
      where: { user_id: user.user_id },
      orderBy: [{ is_default: 'desc' }, { create_date: 'asc' }],
    });
  }

  private async assertUniqueAlqqName(
    user: UserEntity,
    name: string,
    excludeCredentialId?: string,
  ) {
    const dup = await this.alqqCred().findFirst({
      where: {
        user_id: user.user_id,
        name,
        ...(excludeCredentialId
          ? { NOT: { credential_id: excludeCredentialId } }
          : {}),
      },
    });
    if (dup) {
      throw new BadRequestException('该账号名称已存在，请换一个名称做区分');
    }
  }

  private async hasAlqqCredential(user: UserEntity) {
    const count = await this.alqqCred().count({
      where: { user_id: user.user_id },
    });
    return count > 0;
  }

  private async findAlqqRow(user: UserEntity, credentialId?: string) {
    if (credentialId) {
      const row = await this.alqqCred().findFirst({
        where: { user_id: user.user_id, credential_id: credentialId },
      });
      if (!row) {
        throw new NotFoundException('ALQQ 账号不存在');
      }
      return row;
    }
    const rows = await this.listAlqqRows(user);
    const preferred =
      rows.find((item: { is_default: any }) => item.is_default) || rows[0];
    if (!preferred) {
      throw new BadRequestException('请先在「ALQQ 账号」中添加至少一个账号');
    }
    return preferred;
  }

  private async getAlqqSession(user: UserEntity, credentialId?: string) {
    const row = await this.findAlqqRow(user, credentialId);
    try {
      const apiKey = decryptSecret({
        cipher: row.api_key_cipher,
        iv: row.api_key_iv,
        tag: row.api_key_tag,
      });
      return { session: new AlqqSession(apiKey), row };
    } catch (error) {
      customLogger.error({ summary: '解密 ALQQ Key 失败', error });
      throw new BadRequestException('ALQQ 密钥无法解密，请重新保存');
    }
  }

  async listAlqqCredentials(user: UserEntity) {
    const rows = await this.listAlqqRows(user);
    return {
      configured: rows.length > 0,
      items: rows.map(
        (row: {
          credential_id: string;
          name: string;
          is_default: boolean;
          api_key_hint: string;
          last_verified_at: Date;
        }) => this.mapAlqqCredential(row),
      ),
      apiBase: this.alqqBaseUrl(),
      executor: Env.ALQQ_EXECUTOR,
    };
  }

  private async verifyAlqqApiKey(apiKey: string) {
    const session = new AlqqSession(apiKey);
    try {
      await session.verify();
    } catch (error) {
      customLogger.error({ summary: '校验 ALQQ Key 失败', error });
      throw new BadRequestException(
        'ALQQ Key 无效，请到 ALQQ 后台重新生成后再保存',
      );
    }
  }

  private async setDefaultAlqqRow(user: UserEntity, credentialId: string) {
    await this.alqqCred().updateMany({
      where: { user_id: user.user_id, is_default: true },
      data: { is_default: false },
    });
    await this.alqqCred().update({
      where: { credential_id: credentialId },
      data: { is_default: true, update_date: new Date() },
    });
  }

  async createAlqqCredential(user: UserEntity, dto: CreateAlqqCredentialDto) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('请填写账号名称，用于区分多个 ALQQ 账号');
    }
    await this.assertUniqueAlqqName(user, name);
    const apiKey = dto.apiKey.trim();
    await this.verifyAlqqApiKey(apiKey);

    const packed = encryptSecret(apiKey);
    const now = new Date();
    const existing = await this.listAlqqRows(user);
    const isDefault = existing.length === 0 || !!dto.isDefault;
    const credentialId = this.newId('alqq');

    await this.alqqCred().create({
      data: {
        credential_id: credentialId,
        user_id: user.user_id,
        name,
        is_default: isDefault,
        api_key_cipher: packed.cipher,
        api_key_iv: packed.iv,
        api_key_tag: packed.tag,
        api_key_hint: maskSecret(apiKey),
        last_verified_at: now,
      },
    });

    if (isDefault) {
      await this.setDefaultAlqqRow(user, credentialId);
    }

    if (existing.length === 0) {
      await this.platAcc().updateMany({
        where: { user_id: user.user_id, alqq_credential_id: '' },
        data: { alqq_credential_id: credentialId },
      });
    }

    await this.ensureAccounts(user, credentialId);
    return this.listAlqqCredentials(user);
  }

  async updateAlqqCredential(
    user: UserEntity,
    credentialId: string,
    dto: UpdateAlqqCredentialDto,
  ) {
    const row = await this.findAlqqRow(user, credentialId);
    const data: Record<string, unknown> = { update_date: new Date() };
    if (dto.name?.trim()) {
      const name = dto.name.trim();
      await this.assertUniqueAlqqName(user, name, row.credential_id);
      data.name = name;
    }
    if (dto.apiKey?.trim()) {
      const apiKey = dto.apiKey.trim();
      await this.verifyAlqqApiKey(apiKey);
      const packed = encryptSecret(apiKey);
      data.api_key_cipher = packed.cipher;
      data.api_key_iv = packed.iv;
      data.api_key_tag = packed.tag;
      data.api_key_hint = maskSecret(apiKey);
      data.last_verified_at = new Date();
    }
    await this.alqqCred().update({
      where: { credential_id: row.credential_id },
      data,
    });
    return this.listAlqqCredentials(user);
  }

  async setDefaultAlqqCredential(user: UserEntity, credentialId: string) {
    await this.findAlqqRow(user, credentialId);
    await this.setDefaultAlqqRow(user, credentialId);
    return this.listAlqqCredentials(user);
  }

  async deleteAlqqCredential(user: UserEntity, credentialId: string) {
    const row = await this.findAlqqRow(user, credentialId);
    await this.alqqCred().delete({
      where: { credential_id: row.credential_id },
    });
    await this.platAcc().deleteMany({
      where: {
        user_id: user.user_id,
        alqq_credential_id: row.credential_id,
      },
    });
    if (row.is_default) {
      const next = await this.alqqCred().findFirst({
        where: { user_id: user.user_id },
        orderBy: { create_date: 'asc' },
      });
      if (next) {
        await this.setDefaultAlqqRow(user, next.credential_id);
      }
    }
    return this.listAlqqCredentials(user);
  }

  private mapJob(row: {
    job_id: string;
    article_id: string;
    title: string;
    mode: string;
    status: string;
    targets: string;
    credential_id?: string;
    scheduled_at?: Date | null;
    finished_at: Date | null;
    create_date: Date | null;
  }) {
    let targets: PublishTarget[];
    try {
      targets = JSON.parse(row.targets || '[]');
    } catch {
      targets = [];
    }
    return {
      id: row.job_id,
      articleId: row.article_id,
      title: row.title,
      mode: row.mode,
      status: row.status,
      targets,
      credentialId: row.credential_id || '',
      scheduledAt: row.scheduled_at ? row.scheduled_at.getTime() : null,
      createdAt: row.create_date ? row.create_date.getTime() : Date.now(),
      finishedAt: row.finished_at ? row.finished_at.getTime() : null,
    };
  }

  async listPlatforms() {
    const rows = await this.listCatalogRows(true);
    return rows.map((row) => this.mapCatalogRow(row));
  }

  async listAdminPlatforms(user: UserEntity) {
    await this.assertAdmin(user);
    const rows = await this.listCatalogRows();
    return rows.map((row) => this.mapCatalogRow(row));
  }

  async createAdminPlatform(user: UserEntity, dto: CreatePublishPlatformDto) {
    await this.assertAdmin(user);
    await this.ensurePlatformCatalog();
    const exists = await this.platCatalog().findFirst({
      where: { platform_id: dto.platformId },
    });
    if (exists) {
      throw new BadRequestException('平台 ID 已存在');
    }
    const row = await this.platCatalog().create({
      data: {
        platform_id: dto.platformId,
        name: dto.name.trim(),
        color: (dto.color || '#8A847A').trim(),
        login_url: (dto.loginUrl || '').trim(),
        hint: (dto.hint || '').trim(),
        enabled: dto.enabled !== false,
        sort: dto.sort ?? 100,
      },
    });
    return this.mapCatalogRow(row);
  }

  async updateAdminPlatform(
    user: UserEntity,
    platformId: string,
    dto: UpdatePublishPlatformDto,
  ) {
    await this.assertAdmin(user);
    await this.ensurePlatformCatalog();
    const existing = await this.platCatalog().findFirst({
      where: { platform_id: platformId },
    });
    if (!existing) {
      throw new NotFoundException('平台不存在');
    }
    const row = await this.platCatalog().update({
      where: { platform_id: platformId },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        color: dto.color !== undefined ? dto.color.trim() : undefined,
        login_url: dto.loginUrl !== undefined ? dto.loginUrl.trim() : undefined,
        hint: dto.hint !== undefined ? dto.hint.trim() : undefined,
        enabled: dto.enabled,
        sort: dto.sort,
        update_date: new Date(),
      },
    });
    return this.mapCatalogRow(row);
  }

  async listArticles(user: UserEntity, status?: string) {
    const where: { user_id: string; status?: string } = {
      user_id: user.user_id,
    };
    if (status && status !== 'all') {
      where.status = status;
    }

    const rows = await this.prisma.content_article.findMany({
      where,
      orderBy: { update_date: 'desc' },
    });
    return this.enrichArticles(
      user,
      rows.map((row) => this.mapArticle(row)),
    );
  }

  async getArticle(user: UserEntity, articleId: string) {
    await this.syncLatestRunningJob(user, articleId);
    const row = await this.getArticleRow(user, articleId);
    const [article] = await this.enrichArticles(user, [this.mapArticle(row)]);
    return article;
  }

  async refreshArticlePublish(user: UserEntity, articleId: string) {
    return this.getArticle(user, articleId);
  }

  private async syncLatestRunningJob(user: UserEntity, articleId: string) {
    const jobRow = await this.latestJobRow(user, articleId);
    if (jobRow && jobRow.status === 'running') {
      await this.syncJobRowFromAlqq(user, jobRow);
    }
  }

  async createArticle(user: UserEntity, dto: CreateArticleDto) {
    const title = (dto.title || '').trim();
    const content = (dto.content || '').trim();
    if (!title && !content) {
      throw new BadRequestException('请先填写标题或正文');
    }

    const articleId = this.newId('art');
    const cover = dto.cover || null;
    const row = await this.prisma.content_article.create({
      data: {
        article_id: articleId,
        user_id: user.user_id,
        title,
        content,
        digest: (dto.digest || '').trim(),
        cover,
        status: 'draft',
        platforms: '[]',
      },
    });
    await this.media.syncArticleAssets(user.user_id, articleId, cover, content);
    return this.mapArticle(row);
  }

  async updateArticle(
    user: UserEntity,
    articleId: string,
    dto: UpdateArticleDto,
  ) {
    const existing = await this.prisma.content_article.findFirst({
      where: { article_id: articleId, user_id: user.user_id },
    });
    if (!existing) {
      throw new NotFoundException('文章不存在');
    }

    const cover = dto.cover !== undefined ? dto.cover || null : existing.cover;
    const content =
      dto.content !== undefined ? dto.content.trim() : existing.content;
    const row = await this.prisma.content_article.update({
      where: { article_id: articleId },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        content: dto.content !== undefined ? content : undefined,
        digest: dto.digest !== undefined ? dto.digest.trim() : undefined,
        cover: dto.cover !== undefined ? cover : undefined,
        status: dto.status,
        update_date: new Date(),
      },
    });
    await this.media.syncArticleAssets(
      user.user_id,
      articleId,
      row.cover,
      row.content,
    );
    return this.mapArticle(row);
  }

  async deleteArticle(user: UserEntity, articleId: string) {
    const existing = await this.prisma.content_article.findFirst({
      where: { article_id: articleId, user_id: user.user_id },
    });
    if (!existing) {
      throw new NotFoundException('文章不存在');
    }
    await this.media.releaseArticleAssets(articleId);
    await this.prisma.content_publish_job.deleteMany({
      where: { article_id: articleId, user_id: user.user_id },
    });
    await this.prisma.content_article.delete({
      where: { article_id: articleId },
    });
    return { id: articleId };
  }

  async ensureAccounts(user: UserEntity, credentialId: string) {
    const enabled = await this.listCatalogRows(true);
    const existing = await this.platAcc().findMany({
      where: {
        user_id: user.user_id,
        alqq_credential_id: credentialId,
      },
    });
    const have = new Set(
      existing.map((row: { platform_id: string }) => row.platform_id),
    );

    // 只补齐当前启用平台；已下线平台的历史账号行保留
    for (const p of enabled) {
      if (have.has(p.platform_id)) continue;
      await this.platAcc().create({
        data: {
          account_id: this.newId('acc'),
          user_id: user.user_id,
          alqq_credential_id: credentialId,
          platform_id: p.platform_id,
          account_name: `未绑定${p.name}`,
          bound: false,
        },
      });
    }

    return this.platAcc().findMany({
      where: {
        user_id: user.user_id,
        alqq_credential_id: credentialId,
      },
    });
  }

  async listAccounts(user: UserEntity, credentialId?: string) {
    if (!(await this.hasAlqqCredential(user))) {
      return [];
    }
    const cred = await this.findAlqqRow(user, credentialId);
    await this.ensureAccounts(user, cred.credential_id);
    try {
      await this.syncFromAlqq(user, cred.credential_id);
    } catch (error) {
      customLogger.error({ summary: '同步 ALQQ 账号失败', error });
    }
    const catalog = await this.getCatalogMap(true);
    const enabledIds = new Set(
      [...catalog.values()].filter((p) => p.enabled).map((p) => p.id),
    );
    const rows = await this.platAcc().findMany({
      where: {
        user_id: user.user_id,
        alqq_credential_id: cred.credential_id,
      },
    });
    return rows
      .filter((row: { platform_id: string }) => enabledIds.has(row.platform_id))
      .map(
        (row: {
          account_id: string;
          platform_id: string;
          account_name: string;
          bound: boolean;
          external_id?: string;
          bind_status?: string;
          last_sync_at?: Date;
          alqq_credential_id?: string;
        }) => ({
          ...this.mapAccount(row, catalog.get(row.platform_id)),
          credentialId: cred.credential_id,
          credentialName: cred.name,
        }),
      );
  }

  async getAccount(user: UserEntity, accountId: string) {
    const row = await this.platAcc().findFirst({
      where: { account_id: accountId, user_id: user.user_id },
    });
    if (!row) {
      throw new NotFoundException('账号不存在');
    }
    const catalog = await this.getCatalogMap(true);
    const meta = catalog.get(row.platform_id);
    if (!meta || !meta.enabled) {
      throw new NotFoundException('该平台已下线');
    }
    let credentialName = '';
    if (row.alqq_credential_id) {
      const cred = await this.alqqCred().findFirst({
        where: {
          user_id: user.user_id,
          credential_id: row.alqq_credential_id,
        },
      });
      credentialName = cred?.name || '';
    }
    return {
      ...this.mapAccount(row, meta),
      credentialName,
    };
  }

  private async getAccountRow(user: UserEntity, accountId: string) {
    const row = await this.platAcc().findFirst({
      where: { account_id: accountId, user_id: user.user_id },
    });
    if (!row) {
      throw new NotFoundException('账号不存在');
    }
    return row;
  }

  private async syncFromAlqq(user: UserEntity, credentialId: string) {
    const { session } = await this.getAlqqSession(user, credentialId);
    const alqqAccounts = await session.listAccounts();
    const catalog = await this.getCatalogMap(true);
    const rows = await this.platAcc().findMany({
      where: {
        user_id: user.user_id,
        alqq_credential_id: credentialId,
      },
    });
    const now = new Date();

    // SQLite 单写者：必须串行 update，否则易出现 Timed out during query execution
    for (const row of rows) {
      // 绑定确认：只要 ALQQ 有该平台账号即视为已绑定；
      // publishable=false（登录失效/执行端离线）仍写入，发布时再校验
      const match = alqqAccounts.find(
        (item) => this.alqqPlatformOf(item) === row.platform_id,
      );
      const meta = catalog.get(row.platform_id);
      if (match) {
        const publishable = match.publishable !== false;
        await this.platAcc().update({
          where: { account_id: row.account_id },
          data: {
            bound: true,
            bind_status: 'bound',
            external_id: String(match.id),
            account_name:
              match.name ||
              (publishable
                ? `已绑定${(meta && meta.name) || row.platform_id}`
                : `${(meta && meta.name) || row.platform_id}（暂不可发布）`),
            last_sync_at: now,
            update_date: now,
          },
        });
        continue;
      }
      if (row.bind_status === 'pending') {
        await this.platAcc().update({
          where: { account_id: row.account_id },
          data: { last_sync_at: now, update_date: now },
        });
      }
    }
  }

  async startBind(user: UserEntity, accountId: string) {
    const row = await this.getAccountRow(user, accountId);
    const catalog = await this.getCatalogMap(true);
    const meta = catalog.get(row.platform_id);
    if (!meta || !meta.enabled) {
      throw new BadRequestException('该平台已下线，无法绑定');
    }
    if (!row.alqq_credential_id) {
      throw new BadRequestException(
        '请先填写你自己的 ALQQ API Key，再到对应平台完成扫码',
      );
    }
    const cred = await this.findAlqqRow(user, row.alqq_credential_id);
    const now = new Date();
    const updated = await this.platAcc().update({
      where: { account_id: accountId },
      data: {
        bound: false,
        bind_status: 'pending',
        update_date: now,
      },
    });

    const configured = true;
    return {
      account: {
        ...this.mapAccount(updated, meta),
        credentialName: cred.name,
        alqqEnabled: configured,
        alqqUrl: `${this.alqqBaseUrl()}/`,
      },
      alqqEnabled: configured,
      authUrl: `${this.alqqBaseUrl()}/`,
      platformLoginUrl: meta.loginUrl || '',
      steps: [
        `在电脑浏览器打开 ALQQ，使用账号「${cred.name}」对应的 Key 登录`,
        `在 ALQQ 中扫码绑定「${meta.name}」`,
        '回到小程序点击「我已完成登录」',
        '系统解密你的 Key 并校验成功后才会标记为已绑定',
      ],
    };
  }

  async confirmBind(user: UserEntity, accountId: string) {
    const row = await this.getAccountRow(user, accountId);
    if (!row.alqq_credential_id) {
      throw new BadRequestException(
        '请先填写你自己的 ALQQ API Key，并在 ALQQ 完成扫码后再试',
      );
    }

    try {
      await this.syncFromAlqq(user, row.alqq_credential_id);
    } catch (error) {
      customLogger.error({ summary: '确认绑定时同步 ALQQ 失败', error });
      throw new BadRequestException('同步平台账号失败，请稍后重试');
    }

    const latest = await this.getAccountRow(user, accountId);
    if (!latest.bound) {
      await this.platAcc().update({
        where: { account_id: accountId },
        data: { bind_status: 'pending', update_date: new Date() },
      });
      throw new BadRequestException(
        '未检测到该平台已登录账号。请先在 ALQQ 网页或桌面端扫码登录后再点确认。',
      );
    }
    const catalog = await this.getCatalogMap(true);
    return this.mapAccount(latest, catalog.get(latest.platform_id));
  }

  async unbindAccount(user: UserEntity, accountId: string) {
    const row = await this.getAccountRow(user, accountId);
    const catalog = await this.getCatalogMap(true);
    const meta = catalog.get(row.platform_id);
    const updated = await this.platAcc().update({
      where: { account_id: accountId },
      data: {
        bound: false,
        bind_status: 'unbound',
        external_id: null,
        account_name: `未绑定${(meta && meta.name) || row.platform_id}`,
        update_date: new Date(),
      },
    });
    return this.mapAccount(updated, meta);
  }

  async updateAccount(
    user: UserEntity,
    accountId: string,
    dto: UpdateAccountDto,
  ) {
    if (dto.bound) {
      throw new BadRequestException('开启绑定请走授权流程，不能直接打开开关');
    }
    return this.unbindAccount(user, accountId);
  }

  async listJobs(user: UserEntity) {
    const rows = await this.prisma.content_publish_job.findMany({
      where: { user_id: user.user_id },
      orderBy: { create_date: 'desc' },
    });
    return rows.map((row) => this.mapJob(row));
  }

  async getJob(
    user: UserEntity,
    jobId: string,
    options: { refresh?: boolean } = {},
  ) {
    let row = await this.prisma.content_publish_job.findFirst({
      where: { job_id: jobId, user_id: user.user_id },
    });
    if (!row) {
      throw new NotFoundException('任务不存在');
    }
    const shouldSync =
      !!options.refresh ||
      row.status === 'running' ||
      this.jobTargetsNeedRemoteSync(row.targets) ||
      this.jobTargetsNeedMetrics(row.targets);
    if (shouldSync) {
      await this.syncJobRowFromAlqq(user, row, {
        refreshMetrics: !!options.refresh,
      });
      row = await this.prisma.content_publish_job.findFirst({
        where: { job_id: jobId, user_id: user.user_id },
      });
    }
    return this.mapJob(row!);
  }

  async refreshJob(user: UserEntity, jobId: string) {
    return this.getJob(user, jobId, { refresh: true });
  }

  private jobTargetsNeedRemoteSync(targetsJson: string) {
    let targets: PublishTarget[];
    try {
      targets = JSON.parse(targetsJson || '[]');
    } catch {
      return false;
    }
    return targets.some(
      (item) =>
        !!item.alqqBatchId &&
        item.status === 'success' &&
        !item.publishUrl &&
        !item.platformPublicUrl,
    );
  }

  private jobTargetsNeedMetrics(targetsJson: string) {
    let targets: PublishTarget[];
    try {
      targets = JSON.parse(targetsJson || '[]');
    } catch {
      return false;
    }
    return targets.some(
      (item) =>
        item.status === 'success' &&
        (item.readCount == null || item.interactCount == null) &&
        !item.statsCheckedAt,
    );
  }

  private pickRemoteNumber(remote: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const raw = remote[key];
      if (raw === undefined || raw === null || raw === '') continue;
      const num = Number(raw);
      if (Number.isFinite(num) && num >= 0) return Math.floor(num);
    }
    return null;
  }

  private extractRemoteMetrics(remote: Record<string, unknown>) {
    const readCount = this.pickRemoteNumber(remote, [
      'metric_reads',
      'metricReads',
      'read_count',
      'readCount',
      'reads',
      'view_count',
      'viewCount',
      'views',
      'pv',
    ]);
    const interactDirect = this.pickRemoteNumber(remote, [
      'interact_count',
      'interactCount',
      'interaction_count',
      'interactions',
      'engagement_count',
      'engagement',
    ]);
    const like = this.pickRemoteNumber(remote, [
      'metric_likes',
      'metricLikes',
      'like_count',
      'likeCount',
      'likes',
      'digg_count',
    ]);
    const comment = this.pickRemoteNumber(remote, [
      'metric_comments',
      'metricComments',
      'comment_count',
      'commentCount',
      'comments',
      'reply_count',
    ]);
    const share = this.pickRemoteNumber(remote, [
      'metric_shares',
      'metricShares',
      'share_count',
      'shareCount',
      'shares',
      'repost_count',
    ]);
    const collect = this.pickRemoteNumber(remote, [
      'collect_count',
      'collectCount',
      'favorite_count',
      'favorites',
    ]);
    const parts = [like, comment, share, collect].filter(
      (n): n is number => n !== null,
    );
    const interactCount =
      interactDirect !== null
        ? interactDirect
        : parts.length
        ? parts.reduce((sum, n) => sum + n, 0)
        : null;
    return { readCount, interactCount };
  }

  private normalizeTitle(value?: string | null) {
    return String(value || '')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  private analyticsTitleOf(item: Record<string, unknown>) {
    const article =
      item.article && typeof item.article === 'object'
        ? (item.article as Record<string, unknown>)
        : {};
    return String(
      item.content_title ||
        item.contentTitle ||
        article.title ||
        item.title ||
        '',
    ).trim();
  }

  private matchAnalyticsItem(
    target: PublishTarget,
    items: Record<string, unknown>[],
    jobTitle: string,
  ) {
    const platformItems = items.filter(
      (item) => this.alqqPlatformOf(item) === target.platformId,
    );
    if (!platformItems.length) return null;

    if (target.alqqLogId) {
      const byLog = platformItems.find((item) => {
        const id = item.id ?? item.log_id ?? item.logId ?? item.publishLogId;
        return id !== undefined && String(id) === String(target.alqqLogId);
      });
      if (byLog) return byLog;
    }

    const want = this.normalizeTitle(jobTitle);
    if (want) {
      const exact = platformItems.find(
        (item) => this.normalizeTitle(this.analyticsTitleOf(item)) === want,
      );
      if (exact) return exact;
      const fuzzy = platformItems.find((item) => {
        const title = this.normalizeTitle(this.analyticsTitleOf(item));
        return !!title && (title.includes(want) || want.includes(title));
      });
      if (fuzzy) return fuzzy;
    }

    return platformItems.length === 1 ? platformItems[0] : null;
  }

  private applyAnalyticsMetrics(
    target: PublishTarget,
    item: Record<string, unknown> | null,
  ): PublishTarget {
    if (!item) return target;
    const metrics = this.extractRemoteMetrics(item);
    const publishUrl =
      String(
        item.platform_public_url ||
          item.platformPublicUrl ||
          item.publish_url ||
          item.publishUrl ||
          item.url ||
          '',
      ).trim() || target.publishUrl;
    const logId = item.id ?? item.log_id ?? item.logId ?? item.publishLogId;
    const hasMetric =
      metrics.readCount !== null || metrics.interactCount !== null;
    return {
      ...target,
      publishUrl: publishUrl || target.publishUrl,
      platformPublicUrl:
        String(
          item.platform_public_url || item.platformPublicUrl || '',
        ).trim() || target.platformPublicUrl,
      alqqLogId:
        logId !== undefined && logId !== null && String(logId)
          ? String(logId)
          : target.alqqLogId,
      readCount:
        metrics.readCount !== null
          ? metrics.readCount
          : target.readCount ?? null,
      interactCount:
        metrics.interactCount !== null
          ? metrics.interactCount
          : target.interactCount ?? null,
      statsUpdatedAt: hasMetric ? Date.now() : target.statsUpdatedAt ?? null,
    };
  }

  private alqqPlatformOf(account: {
    platform?: string;
    [key: string]: unknown;
  }) {
    return String(
      account.platform ||
        account.platform_id ||
        account.platformId ||
        account.code ||
        '',
    ).toLowerCase();
  }

  private buildLocalTargets(
    platformIds: string[],
    accounts: Array<{
      id: string;
      platformId: string;
      platformName?: string;
      bound: boolean;
    }>,
    mode: string,
    catalog: Map<string, ReturnType<PublisherService['mapCatalogRow']>>,
  ): PublishTarget[] {
    const accountByPlatform = new Map(accounts.map((a) => [a.platformId, a]));
    return platformIds.map((platformId) => {
      const meta = catalog.get(platformId);
      const account = accountByPlatform.get(platformId);
      const bound = !!(account && account.bound);
      return {
        platformId,
        platformName:
          (meta && meta.name) || account?.platformName || platformId,
        accountId: account ? account.id : null,
        bound,
        status: bound ? 'queued' : 'skipped',
        message: bound
          ? mode === 'schedule'
            ? '已预约，到点后发布'
            : '排队发布中'
          : '账号未绑定，已跳过',
      };
    });
  }

  private async publishViaAlqq(
    user: UserEntity,
    article: {
      id: string;
      title: string;
      content: string;
      digest: string;
      cover: string;
    },
    targets: PublishTarget[],
    credentialId?: string,
  ): Promise<PublishTarget[]> {
    const { session } = await this.getAlqqSession(user, credentialId);
    const alqqAccounts = await session.listAccounts();
    const groups = new Map<
      string,
      { accountIds: Array<number | string>; platformIds: string[] }
    >();

    for (const target of targets) {
      if (target.status === 'skipped') continue;
      const match = alqqAccounts.find(
        (item) =>
          this.alqqPlatformOf(item) === target.platformId &&
          item.publishable !== false,
      );
      if (!match) {
        target.status = 'failed';
        target.message = 'ALQQ 未绑定可发布账号';
        continue;
      }
      // 账号页没有执行端开关；网页登录的号会标成 web，免费套餐 Web 额度为 0。
      // 用户实际用桌面端时，发布一律走 desktop。
      let executor = String(match.executor || 'desktop').toLowerCase();
      if (executor === 'web') {
        executor = 'desktop';
      }
      if (
        (executor === 'desktop' || executor === 'edge') &&
        match.executor_online === false
      ) {
        target.status = 'failed';
        target.message =
          executor === 'desktop'
            ? 'ALQQ 桌面端不在线，请先打开桌面端再发布'
            : 'ALQQ 云执行节点不在线，请检查节点后再发布';
        continue;
      }
      const group = groups.get(executor) || {
        accountIds: [],
        platformIds: [],
      };
      group.accountIds.push(match.id);
      group.platformIds.push(target.platformId);
      groups.set(executor, group);
      target.status = 'queued';
      target.message = '已提交 ALQQ';
    }

    if (!groups.size) {
      return targets;
    }

    const remoteArticleId = await session.importArticle({
      title: article.title,
      content: article.content,
      coverImage: article.cover || undefined,
      digest: article.digest || undefined,
    });

    for (const [executor, group] of groups.entries()) {
      const batchId = await session.publish({
        articleId: remoteArticleId,
        accountIds: group.accountIds,
        executor,
        idempotencyKey: `pub-${article.id}-${executor}-${Date.now()}`,
      });
      for (const platformId of group.platformIds) {
        const target = targets.find((item) => item.platformId === platformId);
        if (
          !target ||
          target.status === 'skipped' ||
          target.status === 'failed'
        ) {
          continue;
        }
        target.status = 'queued';
        target.message = '发布中，刷新文章查看结果';
        target.alqqBatchId = batchId;
      }
    }

    return targets;
  }

  private applyRemoteJob(
    target: PublishTarget,
    remote?: Record<string, unknown> & {
      status?: string;
      message?: string;
      error?: { message?: string };
    },
  ): PublishTarget {
    if (!remote) {
      return {
        ...target,
        status: 'queued',
        message: target.message || '发布中',
      };
    }

    const publishUrl =
      String(remote.publish_url || remote.publishUrl || '').trim() ||
      target.publishUrl;
    const platformPublicUrl =
      String(
        remote.platform_public_url || remote.platformPublicUrl || '',
      ).trim() || target.platformPublicUrl;
    const platformStatus =
      String(remote.platform_status || remote.platformStatus || '').trim() ||
      target.platformStatus;
    const logIdRaw =
      remote.log_id ??
      remote.logId ??
      remote.publish_log_id ??
      remote.publishLogId;
    const alqqLogId =
      logIdRaw !== undefined && logIdRaw !== null && String(logIdRaw)
        ? String(logIdRaw)
        : target.alqqLogId;
    const metrics = this.extractRemoteMetrics(remote);
    const hasMetric =
      metrics.readCount !== null || metrics.interactCount !== null;
    const extras: Partial<PublishTarget> = {
      publishUrl: publishUrl || undefined,
      platformPublicUrl: platformPublicUrl || undefined,
      platformStatus: platformStatus || undefined,
      alqqLogId,
      readCount:
        metrics.readCount !== null
          ? metrics.readCount
          : target.readCount ?? null,
      interactCount:
        metrics.interactCount !== null
          ? metrics.interactCount
          : target.interactCount ?? null,
      statsUpdatedAt: hasMetric ? Date.now() : target.statsUpdatedAt ?? null,
    };

    const status = String(remote.status || '').toLowerCase();
    const errMsg =
      (remote.error &&
        typeof remote.error === 'object' &&
        (remote.error as { message?: string }).message) ||
      remote.message;

    if (['failed', 'error'].includes(status)) {
      return {
        ...target,
        ...extras,
        status: 'failed',
        message: String(errMsg || 'ALQQ 发布失败'),
      };
    }
    if (['done', 'success'].includes(status)) {
      return {
        ...target,
        ...extras,
        status: 'success',
        message: String(remote.message || '已发布'),
      };
    }
    if (status === 'skipped') {
      return {
        ...target,
        ...extras,
        status: 'skipped',
        message: String(remote.message || '已跳过'),
      };
    }
    return {
      ...target,
      ...extras,
      status: 'queued',
      message: String(remote.message || '发布中'),
    };
  }

  private async syncJobRowFromAlqq(
    user: UserEntity,
    row: {
      job_id: string;
      article_id: string;
      title?: string;
      mode: string;
      targets: string;
      credential_id?: string;
    },
    options: { refreshMetrics?: boolean } = {},
  ) {
    let targets: PublishTarget[];
    try {
      targets = JSON.parse(row.targets || '[]');
    } catch {
      targets = [];
    }
    const batchIds = [
      ...new Set(
        targets
          .map((item) => item.alqqBatchId)
          .filter((id): id is string => !!id),
      ),
    ];

    const { session } = await this.getAlqqSession(user, row.credential_id);

    if (batchIds.length) {
      const remotes: Array<Record<string, unknown>> = [];
      for (const batchId of batchIds) {
        const batch = await session.getBatch(batchId);
        remotes.push(...((batch.jobs || []) as Array<Record<string, unknown>>));
      }

      targets = targets.map((target) => {
        if (target.status === 'skipped' || !target.alqqBatchId) {
          return target;
        }
        const remote = remotes.find(
          (item) => this.alqqPlatformOf(item as any) === target.platformId,
        );
        return this.applyRemoteJob(target, remote as any);
      });
    }

    // 阅读/互动在「内容排行」接口，不在发布批次里
    const needMetrics =
      !!options.refreshMetrics ||
      targets.some(
        (item) =>
          item.status === 'success' &&
          (item.readCount == null || item.interactCount == null),
      );
    if (needMetrics) {
      targets = await this.enrichTargetsWithAnalytics(
        session,
        targets,
        row.title || '',
        { forceSync: !!options.refreshMetrics },
      );
    }

    const jobStatus = this.jobStatusFromTargets(targets);
    const finished = jobStatus !== 'running';
    const now = new Date();
    const updated = await this.prisma.content_publish_job.update({
      where: { job_id: row.job_id },
      data: {
        status: jobStatus,
        targets: JSON.stringify(targets),
        finished_at: finished ? now : null,
        update_date: now,
      },
    });
    await this.prisma.content_article.update({
      where: { article_id: row.article_id },
      data: {
        status: this.articleStatusFromTargets(row.mode, targets),
        update_date: now,
      },
    });
    return this.mapJob(updated);
  }

  private async enrichTargetsWithAnalytics(
    session: AlqqSession,
    targets: PublishTarget[],
    jobTitle: string,
    _options: { forceSync?: boolean } = {},
  ) {
    // 只用 OpenAPI /publish-logs（API Key 可用）。
    // Web 控制台的 /api/analytics/* 要登录 Token，mk_live Key 会 401，已弃用。
    const byId = new Map<string, Record<string, unknown>>();
    const logIds = [
      ...new Set(
        targets
          .map((item) => item.alqqLogId)
          .filter((id): id is string => !!id),
      ),
    ];
    if (logIds.length) {
      const exact = await session.listPublishLogs({
        ids: logIds.join(','),
        pageSize: Math.max(20, logIds.length),
      });
      for (const item of exact) {
        const id = item.id ?? item.log_id ?? item.logId;
        if (id !== undefined && id !== null) {
          byId.set(String(id), item);
        }
      }
    }

    const recent = await session.listRecentPublishLogs({
      pageSize: 50,
      maxPages: 3,
    });
    for (const item of recent) {
      const id = item.id ?? item.log_id ?? item.logId;
      if (id !== undefined && id !== null && !byId.has(String(id))) {
        byId.set(String(id), item);
      }
    }

    const items = [...byId.values()];
    if (items[0]) {
      customLogger.log({
        summary: 'ALQQ 发布记录样本字段',
        keys: Object.keys(items[0]),
        title: this.analyticsTitleOf(items[0]),
        hasMetricReads:
          items[0].metric_reads != null || items[0].metricReads != null,
      });
    } else {
      customLogger.log({
        summary: 'ALQQ 发布记录为空，无法回填阅读/互动',
        jobTitle,
      });
    }

    const checkedAt = Date.now();
    return targets.map((target) => {
      if (target.status !== 'success' && target.status !== 'queued') {
        return target;
      }
      const matched = this.matchAnalyticsItem(target, items, jobTitle);
      const next = this.applyAnalyticsMetrics(target, matched);
      if (matched) {
        const metrics = this.extractRemoteMetrics(matched);
        customLogger.log({
          summary: 'ALQQ 阅读互动匹配结果',
          platformId: target.platformId,
          matchedTitle: this.analyticsTitleOf(matched),
          readCount: metrics.readCount,
          interactCount: metrics.interactCount,
        });
      }
      return { ...next, statsCheckedAt: checkedAt };
    });
  }

  async syncRunningPublishJobs() {
    const rows = await this.prisma.content_publish_job.findMany({
      where: { status: 'running' },
      take: 30,
      orderBy: { update_date: 'asc' },
    });
    for (const row of rows) {
      try {
        const userRow = await this.prisma.user.findFirst({
          where: { user_id: row.user_id },
        });
        if (!userRow) continue;
        await this.syncJobRowFromAlqq(new UserEntity(userRow), row);
      } catch (error) {
        customLogger.error({
          summary: '同步发布状态失败',
          jobId: row.job_id,
          error:
            error instanceof Error
              ? { message: error.message, name: error.name }
              : error,
        });
      }
    }
  }

  async publish(user: UserEntity, dto: PublishArticleDto) {
    const row = await this.getArticleRow(user, dto.articleId);
    const article = this.mapArticle(row);
    if (!article.title?.trim()) {
      throw new BadRequestException('请先填写标题');
    }
    if (!article.content?.trim()) {
      throw new BadRequestException('请先填写正文');
    }

    const mode = dto.mode === 'schedule' ? 'schedule' : 'publish';
    const scheduledAt = this.resolveScheduledAt(mode, dto.scheduledAt);
    const catalog = await this.getCatalogMap(true);
    const offline = dto.platformIds.filter((id) => {
      const meta = catalog.get(id);
      return !meta || !meta.enabled;
    });
    if (offline.length) {
      throw new BadRequestException(
        `以下平台已下线，无法发布：${offline.join('、')}`,
      );
    }
    const accounts = await this.listAccounts(user, dto.credentialId);
    const targets = this.buildLocalTargets(
      dto.platformIds,
      accounts,
      mode,
      catalog,
    );

    const configured = await this.hasAlqqCredential(user);
    if (!configured && targets.some((t) => t.bound)) {
      throw new BadRequestException('请先在「ALQQ 账号」中添加账号后再发布');
    }

    const now = new Date();
    const defer = mode === 'schedule' && !!scheduledAt;
    const jobStatus = defer
      ? this.jobStatusFromTargets(targets, 'scheduled')
      : this.jobStatusFromTargets(targets);
    const hasQueued = targets.some((t) => t.status === 'queued');

    const job = await this.prisma.content_publish_job.create({
      data: {
        job_id: this.newId('job'),
        user_id: user.user_id,
        article_id: article.id,
        title: article.title,
        mode,
        status: jobStatus,
        targets: JSON.stringify(targets),
        credential_id: dto.credentialId || '',
        scheduled_at: scheduledAt,
        finished_at:
          defer || hasQueued || jobStatus === 'scheduled' ? null : now,
      },
    });

    await this.prisma.content_article.update({
      where: { article_id: article.id },
      data: {
        platforms: JSON.stringify(dto.platformIds),
        status: this.articleStatusFromTargets(mode, targets, defer),
        update_date: now,
      },
    });

    if (!defer && configured && hasQueued) {
      void this.dispatchImmediatePublish(
        job.job_id,
        user,
        article,
        dto.credentialId,
      ).catch((error) => {
        customLogger.error({
          summary: '异步提交 ALQQ 发布失败',
          jobId: job.job_id,
          error:
            error instanceof Error
              ? { message: error.message, name: error.name }
              : error,
        });
      });
    }

    return this.mapJob(job);
  }

  private async dispatchImmediatePublish(
    jobId: string,
    user: UserEntity,
    article: {
      id: string;
      title: string;
      content: string;
      digest: string;
      cover: string;
    },
    credentialId?: string,
  ) {
    const row = await this.prisma.content_publish_job.findFirst({
      where: { job_id: jobId, user_id: user.user_id },
    });
    if (!row || row.status !== 'running') return;

    try {
      let targets: PublishTarget[];
      try {
        targets = JSON.parse(row.targets || '[]');
      } catch {
        targets = [];
      }
      targets = await this.runAlqqOrFail(user, article, targets, credentialId);
      const jobStatus = this.jobStatusFromTargets(targets);
      const now = new Date();
      await this.prisma.content_publish_job.update({
        where: { job_id: jobId },
        data: {
          status: jobStatus,
          targets: JSON.stringify(targets),
          finished_at: jobStatus === 'running' ? null : now,
          update_date: now,
        },
      });
      await this.prisma.content_article.update({
        where: { article_id: article.id },
        data: {
          status: this.articleStatusFromTargets(row.mode, targets),
          update_date: now,
        },
      });
    } catch (error) {
      const now = new Date();

      await this.prisma.content_publish_job.update({
        where: { job_id: jobId },
        data: {
          status: 'failed',
          finished_at: now,
          update_date: now,
          targets: JSON.stringify(
            this.markTargetsFailed(
              row.targets,
              error instanceof Error ? error.message : '提交发布失败',
            ),
          ),
        },
      });
      await this.prisma.content_article.update({
        where: { article_id: article.id },
        data: { status: 'draft', update_date: now },
      });
      throw error;
    }
  }

  async executeDueScheduledJobs() {
    const now = new Date();
    const due = await this.prisma.content_publish_job.findMany({
      where: {
        status: 'scheduled',
        scheduled_at: { lte: now },
      },
      take: 20,
    });

    for (const row of due) {
      const claimed = await this.prisma.content_publish_job.updateMany({
        where: { job_id: row.job_id, status: 'scheduled' },
        data: { status: 'running', update_date: now },
      });
      if (!claimed.count) continue;

      try {
        const userRow = await this.prisma.user.findFirst({
          where: { user_id: row.user_id },
        });
        if (!userRow) {
          throw new Error('用户不存在');
        }
        const user = new UserEntity(userRow);
        const article = await this.getArticle(user, row.article_id);
        let targets: PublishTarget[] = [];
        try {
          targets = JSON.parse(row.targets || '[]');
        } catch {
          targets = [];
        }
        const pending = targets.filter((t) => t.status !== 'skipped');
        if (pending.length) {
          targets = await this.runAlqqOrFail(
            user,
            article,
            targets,
            row.credential_id,
          );
        }
        const jobStatus = this.jobStatusFromTargets(targets);
        const finished = jobStatus !== 'running';
        await this.prisma.content_publish_job.update({
          where: { job_id: row.job_id },
          data: {
            status: jobStatus,
            targets: JSON.stringify(targets),
            finished_at: finished ? new Date() : null,
            update_date: new Date(),
          },
        });
        await this.prisma.content_article.update({
          where: { article_id: article.id },
          data: {
            status: this.articleStatusFromTargets('publish', targets),
            update_date: new Date(),
          },
        });
      } catch (error) {
        customLogger.error({
          summary: '定时发布执行失败',
          jobId: row.job_id,
          error:
            error instanceof Error
              ? { message: error.message, name: error.name }
              : error,
        });
        await this.prisma.content_publish_job.update({
          where: { job_id: row.job_id },
          data: {
            status: 'failed',
            finished_at: new Date(),
            update_date: new Date(),
            targets: JSON.stringify(
              this.markTargetsFailed(
                row.targets,
                error instanceof Error ? error.message : '定时发布失败',
              ),
            ),
          },
        });
      }
    }
  }

  private async runAlqqOrFail(
    user: UserEntity,
    article: {
      id: string;
      title: string;
      content: string;
      digest: string;
      cover: string;
    },
    targets: PublishTarget[],
    credentialId?: string,
  ) {
    try {
      return await this.publishViaAlqq(user, article, targets, credentialId);
    } catch (error) {
      customLogger.error({
        summary: 'ALQQ 发布失败，回退为本地记录',
        error:
          error instanceof Error
            ? { message: error.message, name: error.name }
            : error,
      });
      return targets.map((target) =>
        target.status === 'skipped'
          ? target
          : {
              ...target,
              status: 'failed' as const,
              message: error instanceof Error ? error.message : 'ALQQ 发布失败',
            },
      );
    }
  }

  private jobStatusFromTargets(
    targets: PublishTarget[],
    scheduledStatus = 'running',
  ) {
    const allSkipped = targets.every((t) => t.status === 'skipped');
    const hasQueued = targets.some((t) => t.status === 'queued');
    const hasSuccess = targets.some((t) => t.status === 'success');
    if (allSkipped) return 'failed';
    if (scheduledStatus === 'scheduled' && !allSkipped) return 'scheduled';
    if (hasQueued) return 'running';
    if (hasSuccess) return 'done';
    return 'failed';
  }

  private markTargetsFailed(raw: string, message: string): PublishTarget[] {
    let targets: PublishTarget[];
    try {
      targets = JSON.parse(raw || '[]');
    } catch {
      targets = [];
    }
    return targets.map((target) =>
      target.status === 'skipped'
        ? target
        : { ...target, status: 'failed', message },
    );
  }

  private resolveScheduledAt(mode: string, hm?: string): Date | null {
    if (mode !== 'schedule') return null;
    if (!hm?.trim()) {
      throw new BadRequestException('请选择当天的发布时间');
    }
    const at = this.parseShanghaiToday(hm.trim());
    if (Number.isNaN(at.getTime())) {
      throw new BadRequestException('发布时间格式不正确');
    }
    if (at.getTime() <= Date.now()) {
      throw new BadRequestException('预约时间须晚于当前时间');
    }
    return at;
  }

  private parseShanghaiToday(hm: string) {
    const match = hm.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!match) return new Date(NaN);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return new Date(`${year}-${month}-${day}T${match[1]}:${match[2]}:00+08:00`);
  }
}

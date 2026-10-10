import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileService } from '../file/file.service';
import Env from '../common/const/Env';
import customLogger from '../common/logger';
import { toHttpsUrl } from '../common/utils/url';
import {
  PUBLISHER_DRAFT_EXPIRE_DAYS,
  PUBLISHER_FILE_SOURCE,
  PUBLISHER_MAX_IMAGE_BYTES,
  PUBLISHER_MAX_IMAGES_PER_ARTICLE,
  PUBLISHER_ORPHAN_HOURS,
  PUBLISHER_PUBLISH_GRACE_HOURS_RETRY,
  PUBLISHER_PUBLISH_GRACE_HOURS_SUCCESS,
} from './publisher.const';

@Injectable()
export class PublisherMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FileService,
  ) {}

  private assets(): any {
    return (this.prisma as any).content_article_asset;
  }

  private quotaBytes() {
    return Env.PUBLISHER_USER_IMAGE_QUOTA_MB * 1024 * 1024;
  }

  private formatMb(bytes: number) {
    return (bytes / (1024 * 1024)).toFixed(1);
  }

  extractCdnUrls(cover: string | null | undefined, content: string) {
    const urls = new Set<string>();
    const coverUrl = (cover || '').trim();
    if (coverUrl && this.fileService.isCdnUrl(coverUrl)) {
      urls.add(coverUrl);
    }
    const re = /!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content || ''))) {
      const url = match[1];
      if (this.fileService.isCdnUrl(url)) {
        urls.add(url);
      }
    }
    return [...urls];
  }

  async assertCanUpload(userId: string, incomingSize: number) {
    if (incomingSize > PUBLISHER_MAX_IMAGE_BYTES) {
      const maxMb = PUBLISHER_MAX_IMAGE_BYTES / (1024 * 1024);
      throw new BadRequestException(
        `单张图片不能超过 ${maxMb}MB，请压缩后再上传`,
      );
    }

    const used = await this.fileService.sumOwnedBytes(
      userId,
      PUBLISHER_FILE_SOURCE,
    );
    const quota = this.quotaBytes();
    if (used + incomingSize > quota) {
      throw new BadRequestException(
        `图片空间不足（已用 ${this.formatMb(used)}MB / 共 ${this.formatMb(
          quota,
        )}MB）。草稿中的封面和插图会占用额度，请及时「一键发文」，或删除不用的草稿后再上传。`,
      );
    }
  }

  async uploadForUser(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ url: string; hash: string }> {
    if (!file?.buffer) {
      throw new BadRequestException('请选择图片');
    }
    await this.assertCanUpload(userId, file.size || file.buffer.length);
    const { url, hash } = await this.fileService.uploadFile(
      file.buffer,
      file.originalname,
      { ownerUserId: userId, source: PUBLISHER_FILE_SOURCE },
    );
    return { url, hash };
  }

  /** 上传后立刻挂到文章，避免编辑中尚未保存时变成孤儿 */
  async attachAsset(
    userId: string,
    articleId: string,
    hash: string,
    url: string,
  ) {
    const httpsUrl = toHttpsUrl(url);
    const existing = await this.assets().findFirst({
      where: { article_id: articleId, file_hash: hash },
    });
    if (existing) return;
    const count = await this.assets().count({
      where: { article_id: articleId },
    });
    if (count >= PUBLISHER_MAX_IMAGES_PER_ARTICLE) {
      throw new BadRequestException(
        `单篇文章最多 ${PUBLISHER_MAX_IMAGES_PER_ARTICLE} 张图片（含封面），请精简后再上传`,
      );
    }
    await this.assets().create({
      data: {
        article_id: articleId,
        user_id: userId,
        file_hash: hash,
        url: httpsUrl,
      },
    });
  }

  /** 替换封面/插图时释放旧图；若已无任何文章引用则删七牛 */
  async releaseUrl(userId: string, articleId: string | undefined, url: string) {
    const row = await this.fileService.findByUrl(url);
    if (!row || row.source !== PUBLISHER_FILE_SOURCE) return;
    if (row.owner_user_id && row.owner_user_id !== userId) return;

    if (articleId) {
      await this.assets().deleteMany({
        where: { article_id: articleId, file_hash: row.hash },
      });
    }
    await this.gcUnusedHashes([row.hash]);
  }

  async syncArticleAssets(
    userId: string,
    articleId: string,
    cover: string | null | undefined,
    content: string,
  ) {
    const urls = this.extractCdnUrls(cover, content);
    if (urls.length > PUBLISHER_MAX_IMAGES_PER_ARTICLE) {
      throw new BadRequestException(
        `单篇文章最多 ${PUBLISHER_MAX_IMAGES_PER_ARTICLE} 张图片（含封面），请精简后再保存`,
      );
    }

    const prev = await this.assets().findMany({
      where: { article_id: articleId },
      select: { file_hash: true },
    });

    const next: Array<{ file_hash: string; url: string }> = [];
    for (const url of urls) {
      const row = await this.fileService.findByUrl(url);
      if (row) {
        next.push({ file_hash: row.hash, url: toHttpsUrl(row.url) });
      }
    }

    await this.assets().deleteMany({ where: { article_id: articleId } });
    for (const item of next) {
      await this.assets().create({
        data: {
          article_id: articleId,
          user_id: userId,
          file_hash: item.file_hash,
          url: item.url,
        },
      });
    }

    const nextSet = new Set(next.map((item) => item.file_hash));
    const dropped = prev
      .map((row: { file_hash: string }) => row.file_hash)
      .filter((hash: string) => !nextSet.has(hash));
    await this.gcUnusedHashes(dropped);
  }

  async releaseArticleAssets(articleId: string) {
    const rows = await this.assets().findMany({
      where: { article_id: articleId },
      select: { file_hash: true },
    });
    await this.assets().deleteMany({ where: { article_id: articleId } });
    await this.gcUnusedHashes(
      rows.map((row: { file_hash: string }) => row.file_hash),
    );
  }

  async gcUnusedHashes(hashes: string[]) {
    const unique = [...new Set(hashes.filter(Boolean))];
    if (!unique.length) return;

    const stillUsed = await this.assets().findMany({
      where: { file_hash: { in: unique } },
      select: { file_hash: true },
    });
    const usedSet = new Set(
      stillUsed.map((row: { file_hash: string }) => row.file_hash),
    );
    const removable = unique.filter((hash) => !usedSet.has(hash));
    if (!removable.length) return;

    const owned = await this.prisma.file.findMany({
      where: {
        hash: { in: removable },
        source: PUBLISHER_FILE_SOURCE,
      },
      select: { hash: true },
    });
    await this.fileService.deleteByHashes(owned.map((row) => row.hash));
  }

  /** 回收：上传后未挂到任何文章的孤儿图 */
  async cleanupOrphanUploads() {
    const cutoff = new Date(Date.now() - PUBLISHER_ORPHAN_HOURS * 3600 * 1000);
    const candidates = await this.prisma.file.findMany({
      where: {
        source: PUBLISHER_FILE_SOURCE,
        create_date: { lt: cutoff },
      },
      take: 200,
      select: { hash: true },
    });
    if (!candidates.length) return { deleted: 0 };

    const hashes = candidates.map((row) => row.hash);
    const referenced = await this.assets().findMany({
      where: { file_hash: { in: hashes } },
      select: { file_hash: true },
    });
    const refSet = new Set(
      referenced.map((row: { file_hash: string }) => row.file_hash),
    );
    const orphans = hashes.filter((hash) => !refSet.has(hash));
    const result = await this.fileService.deleteByHashes(orphans);
    customLogger.log({
      summary: '一键发文孤儿图片回收',
      deleted: result.deleted,
    });
    return result;
  }

  /** 清理长期未更新的草稿及其图片 */
  async cleanupExpiredDrafts() {
    const cutoff = new Date(
      Date.now() - PUBLISHER_DRAFT_EXPIRE_DAYS * 24 * 3600 * 1000,
    );
    const drafts = await this.prisma.content_article.findMany({
      where: {
        status: 'draft',
        update_date: { lt: cutoff },
      },
      take: 50,
      select: { article_id: true },
    });

    for (const draft of drafts) {
      await this.releaseArticleAssets(draft.article_id);
      await this.prisma.content_publish_job.deleteMany({
        where: { article_id: draft.article_id },
      });
      await this.prisma.content_article.delete({
        where: { article_id: draft.article_id },
      });
    }

    if (drafts.length) {
      customLogger.log({
        summary: '一键发文过期草稿清理',
        deleted: drafts.length,
      });
    }
    return { deleted: drafts.length };
  }

  private jobHasFailedTarget(targetsJson: string) {
    try {
      const targets = JSON.parse(targetsJson || '[]');
      return (
        Array.isArray(targets) &&
        targets.some((item) => item && item.status === 'failed')
      );
    } catch {
      return false;
    }
  }

  /** 发布结束超过宽限期后释放图片：全成功 6h，有失败 24h，到期都清 */
  async cleanupPublishedAssets() {
    const now = Date.now();
    const minCutoff = new Date(
      now - PUBLISHER_PUBLISH_GRACE_HOURS_SUCCESS * 3600 * 1000,
    );
    const jobs = await this.prisma.content_publish_job.findMany({
      where: {
        status: { in: ['done', 'failed'] },
        finished_at: { lt: minCutoff, not: null },
      },
      take: 80,
      orderBy: { finished_at: 'asc' },
      select: {
        article_id: true,
        job_id: true,
        status: true,
        targets: true,
        finished_at: true,
      },
    });

    let released = 0;
    const seen = new Set<string>();
    for (const job of jobs) {
      if (seen.has(job.article_id)) continue;
      seen.add(job.article_id);

      const finishedAt = job.finished_at ? job.finished_at.getTime() : 0;
      if (!finishedAt) continue;

      const hasFailed =
        job.status === 'failed' || this.jobHasFailedTarget(job.targets);
      const graceMs =
        (hasFailed
          ? PUBLISHER_PUBLISH_GRACE_HOURS_RETRY
          : PUBLISHER_PUBLISH_GRACE_HOURS_SUCCESS) *
        3600 *
        1000;
      if (now - finishedAt < graceMs) continue;

      const newerRunning = await this.prisma.content_publish_job.findFirst({
        where: {
          article_id: job.article_id,
          status: { in: ['running', 'scheduled'] },
        },
      });
      if (newerRunning) continue;

      const assets = await this.assets().findMany({
        where: { article_id: job.article_id },
        select: { id: true },
      });
      if (!assets.length) continue;

      await this.releaseArticleAssets(job.article_id);
      released += 1;
    }

    if (released) {
      customLogger.log({
        summary: '一键发文发布后宽限清理',
        released,
      });
    }
    return { released };
  }

  async runDailyCleanup() {
    await this.cleanupOrphanUploads();
    await this.cleanupExpiredDrafts();
    await this.cleanupPublishedAssets();
  }
}

import axios, { AxiosInstance } from 'axios';
import Env from '../common/const/Env';
import customLogger from '../common/logger';

export type AlqqAccount = {
  id: number | string;
  platform: string;
  publishable?: boolean;
  executor?: string;
  executor_online?: boolean;
  name?: string;
};

export type AlqqBatchJob = {
  platform?: string;
  status?: string;
  message?: string;
  error?: { message?: string };
  publish_url?: string;
  platform_public_url?: string;
  platform_status?: string;
  log_id?: number | string;
  /** 部分平台可能回传；OpenAPI 文档未保证 */
  read_count?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  interact_count?: number;
  [key: string]: unknown;
};

export type AlqqBatch = {
  batch_id?: number | string;
  status?: string;
  jobs?: AlqqBatchJob[];
};

export class AlqqSession {
  private readonly http: AxiosInstance;

  constructor(apiKey: string) {
    this.http = axios.create({
      baseURL: `${Env.ALQQ_API_BASE.replace(/\/$/, '')}/api/openapi/v1`,
      timeout: 20000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  get executor() {
    return Env.ALQQ_EXECUTOR;
  }

  private unwrapError(error: any, fallback: string) {
    const body = error?.response?.data;
    const code = body?.error?.code || '';
    const message = body?.error?.message || body?.message || error?.message;
    customLogger.error({
      summary: fallback,
      status: error?.response?.status,
      code,
      data: body,
    });
    if (code === 'insufficient_scope') {
      return 'ALQQ 密钥缺少发布权限，请到 ALQQ「系统设置 → API 密钥」勾选 publish 后重新保存';
    }
    if (code === 'quota_exceeded' || code === 'daily_quota_exceeded') {
      return `${
        message || 'ALQQ 今日发布额度已用尽'
      }。当前套餐 Web 额度可能为 0，请保持桌面端在线后重试。`;
    }
    if (String(code).startsWith('account_') || code === 'desktop_offline') {
      return `${
        message || 'ALQQ 账号或桌面端不可用'
      }。请在桌面端对知乎点击「重新登录」，并保持桌面端打开。`;
    }
    return message || fallback;
  }

  private unwrap<T>(payload: any): T {
    if (payload && payload.data !== undefined) {
      return payload.data as T;
    }
    return payload as T;
  }

  async verify() {
    const { data } = await this.http.get('/me');
    return this.unwrap(data);
  }

  async listAccounts(): Promise<AlqqAccount[]> {
    const { data } = await this.http.get('/accounts');
    // ALQQ 文档示例：{ accounts: [...], desktop_online, edge_online, edge_nodes }
    const body = this.unwrap<
      | AlqqAccount[]
      | {
          accounts?: AlqqAccount[];
          items?: AlqqAccount[];
          data?: AlqqAccount[];
        }
    >(data);

    if (Array.isArray(body)) return body;
    if (body && Array.isArray((body as any).accounts)) {
      return (body as any).accounts;
    }
    if (body && Array.isArray((body as any).items)) {
      return (body as any).items;
    }
    if (body && Array.isArray((body as any).data)) {
      return (body as any).data;
    }

    customLogger.error({
      summary: 'ALQQ /accounts 响应无法解析为账号列表',
      body,
    });
    return [];
  }

  async importArticle(input: {
    title: string;
    content: string;
    coverImage?: string;
    digest?: string;
  }): Promise<string> {
    const coverImage =
      this.publicImageUrl(input.coverImage) ||
      this.firstContentImage(input.content);
    const payload: Record<string, unknown> = {
      title: input.title,
      content: input.content,
      contentProvenance: 'user_provided',
    };
    if (coverImage) {
      payload.coverImage = coverImage;
    }
    if (input.digest?.trim()) {
      payload.summary = input.digest.trim();
    }

    try {
      const { data } = await this.http.post('/articles', payload);
      const body = this.unwrap<any>(data);
      const articleId = body.article_id || body.articleId || body.id;
      if (!articleId) {
        customLogger.error({ summary: 'ALQQ 导入文章未返回 article_id', body });
        throw new Error('ALQQ 导入文章失败');
      }
      return String(articleId);
    } catch (error: any) {
      throw new Error(this.unwrapError(error, 'ALQQ 导入文章失败'));
    }
  }

  private publicImageUrl(url?: string) {
    let value = (url || '').trim();
    if (!value) return undefined;
    value = value.replace(/^https?:\/\/https?:\/\//i, 'https://');
    if (!/^https?:\/\//i.test(value)) {
      value = `https://${value.replace(/^\/+/, '')}`;
    }
    if (
      /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)(:|\/|$)/i.test(value)
    ) {
      return undefined;
    }
    if (value.startsWith('http://')) {
      value = `https://${value.slice('http://'.length)}`;
    }
    return value;
  }

  private firstContentImage(content?: string) {
    const match = String(content || '').match(
      /!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/,
    );
    return match ? this.publicImageUrl(match[1]) : undefined;
  }

  async publish(input: {
    articleId: string;
    accountIds: Array<number | string>;
    executor?: string;
    idempotencyKey: string;
  }): Promise<string> {
    const executor = (
      input.executor ||
      this.executor ||
      'desktop'
    ).toLowerCase();
    try {
      return await this.postPublish(
        input.articleId,
        input.accountIds,
        executor,
        input.idempotencyKey,
      );
    } catch (error: any) {
      const code = error?.response?.data?.error?.code || '';
      const msg = error?.response?.data?.error?.message || '';
      if (
        executor === 'web' &&
        (code === 'quota_exceeded' || code === 'daily_quota_exceeded') &&
        /web/i.test(msg)
      ) {
        try {
          return await this.postPublish(
            input.articleId,
            input.accountIds,
            'desktop',
            `${input.idempotencyKey}-desktop`,
          );
        } catch {
          throw new Error(this.unwrapError(error, 'ALQQ 创建发布任务失败'));
        }
      }
      throw new Error(this.unwrapError(error, 'ALQQ 创建发布任务失败'));
    }
  }

  private async postPublish(
    articleId: string,
    accountIds: Array<number | string>,
    executor: string,
    idempotencyKey: string,
  ): Promise<string> {
    const { data } = await this.http.post(
      '/publish',
      {
        articleId,
        accountIds: accountIds.map((id) => Number(id) || id),
        executor,
      },
      {
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
    const body = this.unwrap<any>(data);
    const batchId = body.batch_id || body.batchId;
    if (!batchId) {
      customLogger.error({ summary: 'ALQQ 发布未返回 batch_id', body });
      throw new Error('ALQQ 创建发布任务失败');
    }
    return String(batchId);
  }

  async getBatch(batchId: string): Promise<AlqqBatch> {
    const { data } = await this.http.get(`/publish/${batchId}`);
    return this.unwrap<AlqqBatch>(data);
  }

  async pollBatch(batchId: string, timeoutMs = 25000): Promise<AlqqBatch> {
    const started = Date.now();
    let latest: AlqqBatch = { batch_id: batchId };
    while (Date.now() - started < timeoutMs) {
      latest = await this.getBatch(batchId);
      const jobs = latest.jobs || [];
      const done =
        jobs.length > 0 &&
        jobs.every((job) => {
          const status = (job.status || '').toLowerCase();
          return ['done', 'success', 'failed', 'error', 'skipped'].includes(
            status,
          );
        });
      if (done || ['done', 'failed', 'success'].includes(latest.status || '')) {
        return latest;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return latest;
  }

  private parseListBody(body: any): Record<string, unknown>[] {
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.logs)) return body.logs;
    if (Array.isArray(body?.items)) return body.items;
    if (Array.isArray(body?.list)) return body.list;
    if (Array.isArray(body?.rows)) return body.rows;
    if (Array.isArray(body?.data)) return body.data;
    return [];
  }

  /**
   * OpenAPI 发布记录（含 metric_reads / metric_likes 等，与控制台内容排行同源字段）
   * 注意：Web 的 /api/analytics/* 需要登录 Token，API Key 不可用，不要走那条路径
   */
  async listPublishLogs(
    params: {
      page?: number;
      pageSize?: number;
      platform?: string;
      ids?: string;
      status?: string;
    } = {},
  ): Promise<Record<string, unknown>[]> {
    try {
      const { data } = await this.http.get('/publish-logs', {
        params: {
          page: params.page || 1,
          page_size: params.pageSize || 50,
          platform: params.platform || undefined,
          ids: params.ids || undefined,
          status: params.status || undefined,
        },
      });
      return this.parseListBody(this.unwrap<any>(data));
    } catch (error: any) {
      customLogger.error({
        summary: 'ALQQ 拉取发布记录失败',
        message: this.unwrapError(error, 'ALQQ 发布记录不可用'),
      });
      return [];
    }
  }

  /** 多页拉取发布记录，用于按标题匹配阅读/互动 */
  async listRecentPublishLogs(
    options: {
      pageSize?: number;
      maxPages?: number;
      platform?: string;
    } = {},
  ): Promise<Record<string, unknown>[]> {
    const pageSize = options.pageSize || 50;
    const maxPages = options.maxPages || 3;
    const all: Record<string, unknown>[] = [];
    for (let page = 1; page <= maxPages; page += 1) {
      const batch = await this.listPublishLogs({
        page,
        pageSize,
        platform: options.platform,
      });
      all.push(...batch);
      if (batch.length < pageSize) break;
    }
    return all;
  }
}

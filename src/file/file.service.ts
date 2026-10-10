import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as qiniu from 'qiniu';
import * as crypto from 'crypto';
import Env from '../common/const/Env';
import customLogger from '../common/logger';
import { stripUrlProtocol, toHttpsUrl } from '../common/utils/url';

export type UploadFileOptions = {
  ownerUserId?: string;
  source?: string;
};

@Injectable()
export class FileService {
  private readonly accessKey = Env.Q_ACCESS_KEY;
  private readonly secretKey = Env.Q_SECRET_KEY;
  private readonly bucket = Env.Q_BUCKET;

  constructor(private readonly prisma: PrismaService) {}

  private mac() {
    return new qiniu.auth.digest.Mac(this.accessKey, this.secretKey);
  }

  /** 配置的 CDN 域名，无协议，如 cdn.example.com */
  private cdnHost() {
    return stripUrlProtocol(Env.Q_DOMAIN || '').replace(/\/$/, '');
  }

  /** 入库形态：domain/key */
  private toStoragePath(objectKey: string) {
    const host = this.cdnHost();
    const key = String(objectKey || '').replace(/^\/+/, '');
    return host && key ? `${host}/${key}` : key;
  }

  /** 是否本站 CDN 地址（完整 URL 或 domain/path 均可） */
  isCdnUrl(url: string): boolean {
    const bare = stripUrlProtocol(url);
    const host = this.cdnHost();
    if (!bare || !host) return false;
    return bare === host || bare.startsWith(`${host}/`);
  }

  /** 从 URL / domain/path 取出七牛 object key */
  private objectKey(url: string): string | null {
    const bare = stripUrlProtocol(url);
    const host = this.cdnHost();
    if (!bare || !host || !bare.startsWith(`${host}/`)) return null;
    return bare.slice(host.length + 1) || null;
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName?: string,
    options: UploadFileOptions = {},
  ): Promise<{ hash: string; url: string; size: number }> {
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const fileRecord = await this.prisma.file.findUnique({ where: { hash } });

    if (fileRecord) {
      if (options.ownerUserId && !fileRecord.owner_user_id && options.source) {
        await this.prisma.file.update({
          where: { hash },
          data: {
            owner_user_id: options.ownerUserId,
            source: options.source,
            update_date: new Date(),
          },
        });
      }
      return {
        hash,
        url: toHttpsUrl(fileRecord.url),
        size: fileRecord.size,
      };
    }

    const putPolicy = new qiniu.rs.PutPolicy({ scope: this.bucket });
    const uploadToken = putPolicy.uploadToken(this.mac());

    const config = new qiniu.conf.Config();
    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();

    const key = `${hash}.${fileBuffer.slice(0, 4).toString('hex')}.jpg`;
    return new Promise((resolve, reject) => {
      formUploader.put(
        uploadToken,
        key,
        fileBuffer,
        putExtra,
        async (err, body, info) => {
          if (err || info.statusCode !== 200) {
            customLogger.error({
              message: 'file 上传失败',
              fileName,
              error: err,
            });
            reject(err || new Error('上传失败'));
          } else {
            try {
              const stored = this.toStoragePath(body.key);
              await this.prisma.file.create({
                data: {
                  hash,
                  size: fileBuffer.length,
                  url: stored,
                  file_name: fileName || '',
                  owner_user_id: options.ownerUserId || '',
                  source: options.source || '',
                },
              });
              resolve({
                hash,
                url: toHttpsUrl(stored),
                size: fileBuffer.length,
              });
            } catch (dbErr) {
              customLogger.error({
                summary: '图片记录写入数据库失败',
                hash,
                fileName,
                errMsg: (dbErr as Error).message,
              });
              reject(dbErr);
            }
          }
        },
      );
    });
  }

  async sumOwnedBytes(ownerUserId: string, source?: string) {
    const rows = await this.prisma.file.findMany({
      where: {
        owner_user_id: ownerUserId,
        ...(source ? { source } : {}),
      },
      select: { size: true },
    });
    return rows.reduce((sum, row) => sum + (row.size || 0), 0);
  }

  async findByUrl(url: string) {
    if (!this.isCdnUrl(url)) return null;
    return this.prisma.file.findFirst({
      where: { url: stripUrlProtocol(url) },
    });
  }

  async deleteByHashes(hashes: string[]) {
    const unique = [...new Set(hashes.filter(Boolean))];
    if (!unique.length) return { deleted: 0 };

    const rows = await this.prisma.file.findMany({
      where: { hash: { in: unique } },
    });
    if (!rows.length) return { deleted: 0 };

    const keys = rows
      .map((row) => this.objectKey(row.url))
      .filter((key): key is string => !!key);

    if (keys.length) {
      await this.deleteQiniuKeys(keys);
    }

    await this.prisma.file.deleteMany({
      where: { hash: { in: rows.map((row) => row.hash) } },
    });
    return { deleted: rows.length };
  }

  private deleteQiniuKeys(keys: string[]) {
    return new Promise<void>((resolve) => {
      const config = new qiniu.conf.Config();
      const bucketManager = new qiniu.rs.BucketManager(this.mac(), config);
      const ops = keys.map((key) => qiniu.rs.deleteOp(this.bucket, key));
      bucketManager.batch(ops, (err, _body, info) => {
        if (
          err ||
          (info && info.statusCode >= 300 && info.statusCode !== 298)
        ) {
          customLogger.error({
            summary: '七牛批量删除失败',
            keys,
            error: err,
            status: info?.statusCode,
          });
        }
        resolve();
      });
    });
  }
}

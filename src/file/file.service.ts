import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as qiniu from 'qiniu';
import * as crypto from 'crypto';
import Env from '../common/const/Env';
import customLogger from '../common/logger';

export interface FileWithRefCount {
  id: number;
  file_name: string;
  hash: string;
  size: number;
  url: string;
  create_date: Date;
  update_date: Date;
  ref_count: number;
}

@Injectable()
export class FileService {
  private readonly accessKey = Env.Q_ACCESS_KEY;
  private readonly secretKey = Env.Q_SECRET_KEY;
  private readonly bucket = Env.Q_BUCKET;

  constructor(private readonly prisma: PrismaService) {}

  async uploadFile(
    fileBuffer: Buffer,
    fileName?: string,
  ): Promise<{ hash: string; url: string }> {
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const fileRecord = await this.prisma.file.findUnique({ where: { hash } });

    if (fileRecord) {
      return { hash, url: fileRecord.url };
    }

    const mac = new qiniu.auth.digest.Mac(this.accessKey, this.secretKey);
    const putPolicy = new qiniu.rs.PutPolicy({ scope: this.bucket });
    const uploadToken = putPolicy.uploadToken(mac);

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
              const url = `${Env.Q_DOMAIN}/${body.key}`;
              await this.prisma.file.create({
                data: {
                  hash,
                  size: fileBuffer.length,
                  url,
                  file_name: fileName || '',
                },
              });
              resolve({ hash, url });
            } catch (dbErr) {
              customLogger.error({
                summary: '图片记录写入数据库失败',
                hash,
                fileName,
                errMsg: dbErr.message,
              });
              reject(dbErr);
            }
          }
        },
      );
    });
  }

  /**
   * 获取文件列表（带引用计数）
   * @param page 页码
   * @param pageSize 每页数量
   */
  async listFiles(
    page = 1,
    pageSize = 20,
  ): Promise<{ list: FileWithRefCount[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        skip,
        take: pageSize,
        orderBy: { create_date: 'desc' },
      }),
      this.prisma.file.count(),
    ]);
    console.log('===files', files);

    // 获取所有 hash
    const hashes = files.map((f) => f.hash);

    // 查询引用计数（当前只统计 store_goods_version 表，后续可扩展）
    const goodsVersionRefs = await this.prisma.store_goods_version.groupBy({
      by: ['image_hash'],
      where: {
        image_hash: { in: hashes },
      },
      _count: { image_hash: true },
    });

    // 创建 hash -> count 映射
    const refCountMap = new Map<string, number>();
    for (const ref of goodsVersionRefs) {
      if (ref.image_hash) {
        refCountMap.set(ref.image_hash, ref._count.image_hash);
      }
    }

    // 组装结果
    const list: FileWithRefCount[] = files.map((file) => ({
      ...file,
      ref_count: refCountMap.get(file.hash) || 0,
    }));

    return { list, total };
  }

  /**
   * 删除文件（从七牛云和数据库）
   * @param hash 文件 hash
   */
  async deleteFile(hash: string): Promise<{ success: boolean }> {
    // 检查文件是否存在
    const file = await this.prisma.file.findUnique({ where: { hash } });
    if (!file) {
      throw new Error('文件不存在');
    }

    // 检查引用计数
    const refCount = await this.getRefCount(hash);
    if (refCount > 0) {
      throw new Error('文件正在被使用，无法删除');
    }

    // 从七牛云删除
    await this.deleteFromQiniu(file.url);

    // 从数据库删除
    await this.prisma.file.delete({ where: { hash } });

    return { success: true };
  }

  /**
   * 获取文件的引用计数
   */
  private async getRefCount(hash: string): Promise<number> {
    // 当前只统计 store_goods_version 表
    // 后续可扩展统计其他表
    const goodsVersionCount = await this.prisma.store_goods_version.count({
      where: { image_hash: hash },
    });

    return goodsVersionCount;
  }

  /**
   * 从七牛云删除文件
   */
  private deleteFromQiniu(fileUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const mac = new qiniu.auth.digest.Mac(this.accessKey, this.secretKey);
        const config = new qiniu.conf.Config();
        const bucketManager = new qiniu.rs.BucketManager(mac, config);

        // 从 URL 中提取 key
        // URL 格式: https://domain.com/key
        const urlObj = new URL(fileUrl);
        const key = urlObj.pathname.slice(1); // 去掉开头的 /

        bucketManager.delete(this.bucket, key, (err, respBody, respInfo) => {
          if (err) {
            customLogger.error({
              message: '七牛云删除文件失败',
              key,
              error: err,
            });
            reject(err);
          } else if (respInfo.statusCode === 612) {
            // 文件不存在，视为删除成功
            customLogger.warn({
              message: '七牛云文件不存在',
              key,
            });
            resolve();
          } else if (respInfo.statusCode !== 200) {
            customLogger.error({
              message: '七牛云删除文件失败',
              key,
              statusCode: respInfo.statusCode,
              respBody,
            });
            reject(new Error(`删除失败: ${respInfo.statusCode}`));
          } else {
            customLogger.log({
              message: '七牛云文件删除成功',
              key,
            });
            resolve();
          }
        });
      } catch (err) {
        customLogger.error({
          message: '七牛云删除文件异常',
          fileUrl,
          error: err,
        });
        reject(err);
      }
    });
  }
}

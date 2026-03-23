import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as qiniu from 'qiniu';
import * as crypto from 'crypto';
import Env from '../common/const/Env';
import customLogger from '../common/logger';

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
        (err, body, info) => {
          if (err || info.statusCode !== 200) {
            customLogger.error({
              message: 'file 上传失败',
              fileName,
              error: err,
            });
            reject(err || new Error('上传失败'));
          } else {
            const url = `${Env.Q_DOMAIN}/${body.key}`;
            this.prisma.file.create({
              data: {
                hash,
                size: fileBuffer.length,
                url,
                file_name: fileName || '',
              },
            });
            resolve({ hash, url });
          }
        },
      );
    });
  }
}

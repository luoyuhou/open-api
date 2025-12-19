import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from './entities/file.entity';
import * as qiniu from 'qiniu';
import * as crypto from 'crypto';
import Env from '../common/const/Env';
import customLogger from '../common/logger';

@Injectable()
export class FileService {
  private readonly accessKey = Env.Q_ACCESS_KEY;
  private readonly secretKey = Env.Q_SECRET_KEY;
  private readonly bucket = Env.Q_BUCKET;

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
  ) {}

  async uploadFile(
    fileBuffer: Buffer,
    fileName?: string,
  ): Promise<{ hash: string; url: string }> {
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const fileRecord = await this.fileRepository.findOne({ where: { hash } });

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
            const newFile = this.fileRepository.create({
              hash,
              url,
              file_name: fileName,
            });
            this.fileRepository.save(newFile);
            resolve({ hash, url });
          }
        },
      );
    });
  }
}

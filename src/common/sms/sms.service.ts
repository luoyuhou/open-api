import { Injectable } from '@nestjs/common';
import fetchClient from '../client/fetch-client';
import Env from '../const/Env';
import customLogger from '../logger';

@Injectable()
export class SmsService {
  /**
   * 发送短信验证码
   * @param phone 手机号
   * @param code 验证码
   * @param minus 有效时长
   */
  async sendVerificationCode(
    phone: string,
    code: string,
    minus: number,
  ): Promise<boolean> {
    const url = Env.SPUG_SMS_URL;
    customLogger.log({
      summary: '短信验证',
      phone,
      message: `Attempting to send SMS to ${phone} via Spug`,
    });

    try {
      const response = await fetchClient.post<{
        code: 200;
        msg: string;
        request_id: string;
      }>(url, {
        key1: '尾号' + phone.slice(-4) + '用户',
        key2: code,
        key3: minus,
        targets: phone,
      });

      if (response.code !== 200) {
        customLogger.error({
          summary: '短信验证',
          phone,
          ...response,
        });
        return false;
      }

      customLogger.log({
        summary: '短信验证',
        phone,
      });
      return true;
    } catch (error) {
      customLogger.error({
        summary: '短信验证',
        phone,
        message: `Failed to send SMS to ${phone}: ${error.message}`,
      });
      return false;
    }
  }
}

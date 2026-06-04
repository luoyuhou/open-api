import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { AuthService } from '../auth.service';
import { WxLoginDto } from '../dto/login.dto';

@Injectable()
export class WxLocalStrategy extends PassportStrategy(Strategy, 'wx-local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'signature',
      passwordField: 'rawData',
      passReqToCallback: true,
    });
  }

  async validate(req: Request) {
    const result = await this.authService.loginByWx(
      req.body as unknown as WxLoginDto,
    );
    return { ...result.user, openid: result.openid };
  }
}

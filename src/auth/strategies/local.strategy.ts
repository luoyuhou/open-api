import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { AuthService } from '../auth.service';
import { UserEntity } from '../../users/entities/user.entity';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'phone',
      passReqToCallback: false,
    });
  }

  validate(phone: string, password: string): Promise<UserEntity> {
    return this.authService.loginByPassword(phone, password);
  }
}

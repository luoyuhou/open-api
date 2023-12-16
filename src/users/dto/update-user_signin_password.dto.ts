import { PickType } from '@nestjs/mapped-types';
import { CreateUser_signin_passwordDto } from './create-user_signin_password.dto';

export class UpdateUser_signin_passwordDto extends PickType(
  CreateUser_signin_passwordDto,
  ['salt', 'password'],
) {}

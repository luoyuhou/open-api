import { PickType } from '@nestjs/mapped-types';
import { CreateUser_signup_passwordDto } from './create-user_signup_password.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUser_signup_passwordDto extends PickType(
  CreateUser_signup_passwordDto,
  ['salt', 'password'],
) {
  @ApiProperty()
  password: string;
}

export class UpdateUser_signup_passwordInputDto extends PickType(
  CreateUser_signup_passwordDto,
  ['password'],
) {
  @ApiProperty()
  password: string;
}

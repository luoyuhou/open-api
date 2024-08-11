import { PickType } from '@nestjs/mapped-types';
import { CreateUser_signup_passwordDto } from './create-user_signup_password.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UpdateUserPasswordDto extends PickType(
  CreateUser_signup_passwordDto,
  ['password'],
) {
  @IsOptional()
  @ApiProperty()
  password: string;
}

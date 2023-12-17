import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PickType } from '@nestjs/mapped-types';

export class CreateUser_signup_passwordDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  @MaxLength(64)
  @ApiProperty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  @ApiProperty()
  salt: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @ApiProperty()
  password: string;
}

export class CreateUser_signup_passwordByInputDto extends PickType(
  CreateUser_signup_passwordDto,
  ['password'],
) {
  @ApiProperty()
  password: string;
}

import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PickType } from '@nestjs/mapped-types';

export class CreateUser_signin_passwordDto {
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

export class CreateUser_signin_passwordByInputDto extends PickType(
  CreateUser_signin_passwordDto,
  ['password'],
) {}

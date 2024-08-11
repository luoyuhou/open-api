// src/users/entities/user.entity.ts
import { ApiProperty } from '@nestjs/swagger';

export class UserEntity {
  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  @ApiProperty()
  id: number;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  status: number;

  @ApiProperty()
  first_name: string;

  @ApiProperty()
  last_name: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  email: string | null;

  @ApiProperty()
  avatar: string | null;

  @ApiProperty()
  gender: number;

  @ApiProperty()
  bio: string | null;

  @ApiProperty()
  create_date: Date;

  @ApiProperty()
  update_date: Date;
}

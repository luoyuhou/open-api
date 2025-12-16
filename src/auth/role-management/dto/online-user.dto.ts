import { ApiProperty } from '@nestjs/swagger';

export class OnlineUserDto {
  @ApiProperty({ description: '用户ID' })
  user_id: string;

  @ApiProperty({ description: '用户名（姓）' })
  first_name: string;

  @ApiProperty({ description: '用户名（名）' })
  last_name: string;

  @ApiProperty({ description: '手机号' })
  phone: string;

  @ApiProperty({ description: '邮箱', required: false })
  email: string | null;

  @ApiProperty({ description: 'Session ID' })
  session_id: string;
}

export class KickOfflineDto {
  @ApiProperty({ description: '用户ID' })
  user_id: string;
}

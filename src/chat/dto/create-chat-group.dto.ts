import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateChatGroupDto {
  @ApiProperty({ description: '群聊名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: [String], description: '群成员 user_id 列表' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  memberIds: string[];
}

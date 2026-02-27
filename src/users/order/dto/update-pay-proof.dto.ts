import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdatePayProofDto {
  @ApiProperty({ description: '支付凭证图片 URL' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  pay_proof_url: string;
}

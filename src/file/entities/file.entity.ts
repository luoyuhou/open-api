import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('file')
export class FileEntity {
  constructor(partial: Partial<FileEntity>) {
    Object.assign(this, partial);
  }

  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ length: 128 })
  file_name: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  @Column({ unique: true, length: 32 })
  hash: string;

  @ApiProperty()
  @Column({ length: 128 })
  url: string;

  @ApiProperty()
  @CreateDateColumn()
  create_date: Date;

  @ApiProperty()
  @UpdateDateColumn()
  update_date: Date;
}

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
  @Column({ length: 128, nullable: true })
  file_name: string;

  @ApiProperty()
  @Column({ unique: true, length: 256 })
  hash: string;

  @ApiProperty()
  @Column({ length: 256 })
  url: string;

  @ApiProperty()
  @CreateDateColumn()
  create_date: Date;

  @ApiProperty()
  @UpdateDateColumn()
  update_date: Date;
}

import { PartialType } from '@nestjs/swagger';
import { CreateUsersFetchDto } from './create-users-fetch.dto';

export class UpdateUsersFetchDto extends PartialType(CreateUsersFetchDto) {}

import { PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PickType(CreateUserDto, [
  'first_name',
  'last_name',
  'phone',
  'phone',
  'avatar',
]) {}

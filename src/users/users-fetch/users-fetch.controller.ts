import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UsersFetchService } from './users-fetch.service';
import { CreateUsersFetchDto } from './dto/create-users-fetch.dto';
import { UpdateUsersFetchDto } from './dto/update-users-fetch.dto';

@Controller('/users/users-fetch')
export class UsersFetchController {
  constructor(private readonly usersFetchService: UsersFetchService) {}

  @Post()
  create(@Body() createUsersFetchDto: CreateUsersFetchDto) {
    return this.usersFetchService.create(createUsersFetchDto);
  }

  @Get()
  findAll() {
    return this.usersFetchService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersFetchService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUsersFetchDto: UpdateUsersFetchDto,
  ) {
    return this.usersFetchService.update(+id, updateUsersFetchDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersFetchService.remove(+id);
  }
}

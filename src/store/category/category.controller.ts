import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { FindAllCategoryDto } from './dto/findAll-category.dto';
import { Request } from 'express';
import { UserEntity } from '../../users/entities/user.entity';
import { SwitchRankCategoryDto } from './dto/switch-rank-category.dto';

@UseGuards(SessionAuthGuard)
@Controller('store/category')
@ApiTags('store/category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiProperty()
  async create(
    @Req() req: Request,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoryService.create(
      createCategoryDto,
      req.user as UserEntity,
    );
  }

  @Get('/:id')
  @ApiProperty()
  async findAll(@Param('id') id: string, @Query() { pid }: FindAllCategoryDto) {
    return this.categoryService.findAll({ store_id: id, pid });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(+id);
  }

  @Patch(':id/rank')
  @ApiProperty()
  async switchRank(
    @Param('id') id: string,
    @Body() args: SwitchRankCategoryDto,
  ) {
    return this.categoryService.switchRank(id, args);
  }

  @Patch(':id')
  @ApiProperty()
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiProperty()
  async remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }

  @Patch('reactive/:id')
  @ApiProperty()
  async reactive(@Param('id') id: string) {
    return this.categoryService.reactive(id);
  }
}

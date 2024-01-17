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
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { FindAllCategoryDto } from './dto/findAll-category.dto';

@UseGuards(SessionAuthGuard)
@Controller('store/category')
@ApiTags('store/category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(SessionAuthGuard)
  @ApiProperty()
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  @UseGuards(SessionAuthGuard)
  @ApiProperty()
  async findAll(@Query() args: FindAllCategoryDto) {
    return this.categoryService.findAll(args);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(SessionAuthGuard)
  @ApiProperty()
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(SessionAuthGuard)
  @ApiProperty()
  async remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }

  @Patch('reactive/:id')
  @UseGuards(SessionAuthGuard)
  @ApiProperty()
  async reactive(@Param('id') id: string) {
    return this.categoryService.reactive(id);
  }
}

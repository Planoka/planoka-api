import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Public } from '../auth/roles.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public() // La liste des catégories doit être accessible publiquement
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }
}

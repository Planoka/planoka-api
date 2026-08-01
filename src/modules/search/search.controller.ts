import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/roles.decorator';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  search(@Query('q') query?: string) {
    return this.searchService.search(query?.trim() || '');
  }
}

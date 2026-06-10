import { Controller, Get, Param } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';

@Controller('public')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('businesses')
  listBusinesses() {
    return this.marketplaceService.listBusinesses();
  }

  @Get('businesses/:slug')
  getBusiness(@Param('slug') slug: string) {
    return this.marketplaceService.getBusiness(slug);
  }

  @Get('businesses/:slug/products')
  listBusinessProducts(@Param('slug') slug: string) {
    return this.marketplaceService.listBusinessProducts(slug);
  }

  @Get('featured-products')
  listFeaturedProducts() {
    return this.marketplaceService.listFeaturedProducts();
  }
}

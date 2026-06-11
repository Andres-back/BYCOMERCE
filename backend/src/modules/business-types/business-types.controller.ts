import { Controller, Get, Param } from '@nestjs/common';
import { BusinessTypesService } from './business-types.service';

@Controller('business-types')
export class BusinessTypesController {
  constructor(private readonly businessTypesService: BusinessTypesService) {}

  @Get()
  getPresets() {
    return this.businessTypesService.getPresets();
  }

  @Get(':id')
  getPreset(@Param('id') id: string) {
    return this.businessTypesService.getPreset(id);
  }

  @Get(':id/categorias')
  getCategorias(@Param('id') id: string) {
    return this.businessTypesService.getCategorias(id);
  }

  @Get(':id/atributos')
  getAtributos(@Param('id') id: string) {
    return this.businessTypesService.getAtributos(id);
  }
}

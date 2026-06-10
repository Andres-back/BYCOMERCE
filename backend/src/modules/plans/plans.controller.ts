import { Controller, Get, Param } from '@nestjs/common';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  list() {
    return this.plansService.listActivePlans();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.plansService.getPlan(id);
  }
}

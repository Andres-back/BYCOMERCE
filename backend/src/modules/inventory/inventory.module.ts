import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CategoriesController } from './controllers/categories.controller';
import { ProductsController } from './controllers/products.controller';
import { PurchasesController } from './controllers/purchases.controller';
import { SuppliersController } from './controllers/suppliers.controller';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryService } from './services/inventory.service';
import { ProcurementService } from './services/procurement.service';

@Module({
  imports: [AuthModule, ConfigModule, JwtModule.register({})],
  controllers: [CategoriesController, ProductsController, PurchasesController, SuppliersController],
  providers: [InventoryService, ProcurementService, InventoryRepository, RolesGuard, JwtAuthGuard],
  exports: [InventoryService],
})
export class InventoryModule {}

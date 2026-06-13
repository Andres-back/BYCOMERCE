import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiModule } from '../ai/ai.module';
import { CategoriesController } from './controllers/categories.controller';
import { ProductsController } from './controllers/products.controller';
import { PurchasesController } from './controllers/purchases.controller';
import { SuppliersController } from './controllers/suppliers.controller';
import { InventoryRepository } from './repositories/inventory.repository';
import { InvoiceVisionService } from './services/invoice-vision.service';
import { InventoryService } from './services/inventory.service';
import { ProcurementService } from './services/procurement.service';

@Module({
  imports: [AuthModule, ConfigModule, AiModule, JwtModule.register({})],
  controllers: [CategoriesController, ProductsController, PurchasesController, SuppliersController],
  providers: [InventoryService, ProcurementService, InvoiceVisionService, InventoryRepository, RolesGuard, JwtAuthGuard],
  exports: [InventoryService],
})
export class InventoryModule {}

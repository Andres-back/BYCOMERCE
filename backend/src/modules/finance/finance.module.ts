import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CashRegistersController } from './cash-registers.controller';
import { ExpensesController } from './expenses.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [AuditModule, AuthModule, ConfigModule, JwtModule.register({})],
  controllers: [CashRegistersController, ExpensesController],
  providers: [FinanceService, RolesGuard, JwtAuthGuard],
})
export class FinanceModule {}

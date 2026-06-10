import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

@Module({
  imports: [AuthModule, ConfigModule, JwtModule.register({})],
  controllers: [PosController],
  providers: [PosService, RolesGuard, JwtAuthGuard],
})
export class PosModule {}

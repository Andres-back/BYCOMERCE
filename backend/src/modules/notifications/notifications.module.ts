import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationEventListener } from './notification-event.listener';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationEventListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}

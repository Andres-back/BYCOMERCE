import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { SubscriptionCronService } from './subscription-cron.service';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  providers: [SubscriptionCronService],
})
export class JobsModule {}

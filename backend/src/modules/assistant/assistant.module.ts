import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AiModule } from '../ai/ai.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { IntentRegistry } from './intents/intent-registry';

@Module({
  imports: [AiModule, JwtModule.register({})],
  controllers: [AssistantController],
  providers: [AssistantService, IntentRegistry],
  exports: [AssistantService],
})
export class AssistantModule {}

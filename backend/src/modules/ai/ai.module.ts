import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiConfigService } from './ai-config.service';
import { AiVisionService } from './ai-vision.service';
import { GroqService } from './groq.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AiConfigService, AiVisionService, GroqService],
  exports: [AiConfigService, AiVisionService, GroqService],
})
export class AiModule {}

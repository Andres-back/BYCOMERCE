import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';
import { ChatRequest, ChatResponse } from './intents/intent.types';

@Controller('assistant')
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('chat')
  chat(
    @CurrentUser() user: RequestUser,
    @Body() body: ChatRequest,
  ): Promise<ChatResponse> {
    return this.assistantService.chat(body, {
      id: user.id,
      tenantId: user.tenantId,
      rol: user.rol,
    });
  }

  @Get('intents')
  listIntents() {
    return { data: this.assistantService.listIntents() };
  }
}

import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './services/chat.service';
import { AIService } from './services/ai.service';
import { OpenAIProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { BookingsModule } from '../bookings/bookings.module';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [KnowledgeModule, BookingsModule, RoomsModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    AIService,
    OpenAIProvider,
    ClaudeProvider,
  ],
  exports: [ChatService, AIService],
})
export class ChatModule {}

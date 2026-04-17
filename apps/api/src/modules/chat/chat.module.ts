import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './services/chat.service';
import { AIService } from './services/ai.service';
import { GeminiProvider } from './providers/gemini.provider';
import { MockProvider } from './providers/mock.provider';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { BookingsModule } from '../bookings/bookings.module';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [KnowledgeModule, BookingsModule, RoomsModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    AIService,
    GeminiProvider,
    MockProvider,
  ],
  exports: [ChatService, AIService],
})
export class ChatModule { }

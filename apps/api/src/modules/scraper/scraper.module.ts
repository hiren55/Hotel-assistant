import { Module } from '@nestjs/common';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { KnowledgeService } from '../knowledge/knowledge.service';

@Module({
    controllers: [ScraperController],
    providers: [ScraperService, KnowledgeService],
    exports: [ScraperService],
})
export class ScraperModule { }

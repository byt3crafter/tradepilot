
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 0 * * * *') // Runs every hour
  handleCron() {
    this.logger.debug('Running scheduled tasks...');
    // Placeholder for future tasks like checking for analysis reviews
  }
}

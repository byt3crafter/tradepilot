import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService], // Export for other modules to use
})
export class AssetsModule {}
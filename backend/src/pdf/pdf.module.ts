import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BrokerAccountsModule } from '../broker-accounts/broker-accounts.module';
import { DrawdownService } from '../broker-accounts/drawdown.service';

@Module({
  imports: [PrismaModule, BrokerAccountsModule],
  controllers: [PdfController],
  providers: [PdfService, DrawdownService],
  exports: [PdfService],
})
export class PdfModule {}

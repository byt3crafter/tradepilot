import { Expose } from 'class-transformer';
import { DrawdownType } from '@prisma/client';

export class PropFirmTemplateDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  firmName: string;

  @Expose()
  accountSize: number;

  @Expose()
  profitTarget: number;

  @Expose()
  dailyDrawdown: number;

  @Expose()
  maxDrawdown: number;

  @Expose()
  drawdownType: DrawdownType;

  @Expose()
  minTradingDays: number;

  @Expose()
  isActive: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

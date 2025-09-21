import { Expose } from 'class-transformer';

export class AdminStatsDto {
  @Expose()
  totalUsers: number;

  @Expose()
  activeSubscriptions: number;

  @Expose()
  trialUsers: number;

  @Expose()
  mrr: number;
}

import { Expose } from 'class-transformer';

export class AdminUserDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  fullName: string;

  @Expose()
  role: string;

  @Expose()
  createdAt: Date;

  @Expose()
  lastLoginAt: Date;

  @Expose()
  subscriptionStatus: string;

  @Expose()
  trialEndsAt: Date;

  @Expose()
  proAccessExpiresAt: Date;

  @Expose()
  proAccessReason: string;

  @Expose()
  apiUsageCost: number;

  @Expose()
  apiUsageTokens: number;

  @Expose()
  lastApiUsage: Date;
}

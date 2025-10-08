import { Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  fullName: string;

  @Expose()
  isEmailVerified: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  lastLoginAt: Date;

  @Expose()
  role: string;

  @Expose()
  subscriptionStatus: string;

  @Expose()
  trialEndsAt: Date;
  
  @Expose()
  proAccessExpiresAt: Date;

  @Expose()
  featureFlags: {
    analysisTrackerEnabled: boolean;
  };
}

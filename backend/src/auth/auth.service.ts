
import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AssetsService } from '../assets/assets.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly assetsService: AssetsService,
  ) {}

  /**
   * Validates the user from the Clerk Token.
   * If the user does not exist in Prisma, creates them (JIT Provisioning).
   */
  async validateClerkUser(payload: { sub: string; email?: string; }) {
    const clerkId = payload.sub;
    // Fallback email if not in token (depends on Clerk JWT template settings)
    const email = payload.email || `${clerkId}@clerk.user`; 

    let user = await this.usersService.findById(clerkId).catch(() => null);

    if (!user) {
      this.logger.log(`User ${clerkId} not found in DB. Provisioning...`);
      
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 15);

      user = await this.usersService.create({
        id: clerkId, // Use Clerk ID as Primary Key
        email: email,
        fullName: 'Trader', // Default name, user can update later via profile
        isEmailVerified: true, // Clerk handles verification
        trialEndsAt,
      });

      // Seed default assets for the new user
      await this.assetsService.seedDefaultAssetsForUser(user.id);
      this.logger.log(`User ${clerkId} provisioned successfully.`);
    } else {
        // Update last login
        await this.usersService.update(user.id, { lastLoginAt: new Date() });
    }

    return user;
  }
}

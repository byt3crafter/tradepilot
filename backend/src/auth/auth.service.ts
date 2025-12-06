
import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AssetsService } from '../assets/assets.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly assetsService: AssetsService,
  ) { }

  /**
   * Validates the user from the Clerk Token.
   * If the user does not exist in Prisma, creates them (JIT Provisioning).
   */
  async validateClerkUser(payload: { sub: string; email?: string; public_metadata?: any; unsafe_metadata?: any }) {
    const clerkId = payload.sub;
    // Fallback email if not in token (depends on Clerk JWT template settings)
    const email = payload.email || `${clerkId}@clerk.user`;
    // Extract role from Clerk's public_metadata (if present in JWT)
    const clerkRole = payload.public_metadata?.role;

    // Extract referral code from metadata (could be in public or unsafe depending on how signup passed it)
    const referralCode = payload.unsafe_metadata?.referralCode || payload.public_metadata?.referralCode;

    let user = await this.usersService.findById(clerkId).catch(() => null);

    if (!user) {
      // New user - provision with role from Clerk or default to USER
      const role = clerkRole || 'USER';
      this.logger.log(`User ${clerkId} not found in DB. Provisioning with role: ${role}...`);

      let isEarlySupporter = false;
      let referredByUserId: string | null = null;
      let trialEndsAt = new Date(); // Default: Trial ends NOW (immediate payment required)

      // Check Referral Code
      if (referralCode) {
        if (referralCode === 'beta2025') {
          isEarlySupporter = true;
          this.logger.log(`User ${clerkId} used beta code. Granting Early Supporter status.`);
        } else {
          // Check if it's a valid User ID
          const referrer = await this.usersService.findById(referralCode).catch(() => null);
          if (referrer) {
            isEarlySupporter = true;
            referredByUserId = referrer.id;
            this.logger.log(`User ${clerkId} referred by ${referrer.id}. Granting Early Supporter status.`);
          }
        }
      }

      // Set Trial Duration
      if (isEarlySupporter) {
        // 30 Days Free Trial for Early Supporters
        trialEndsAt.setDate(trialEndsAt.getDate() + 30);
      } else {
        // No Trial for regular users (expire immediately/yesterday to be safe)
        trialEndsAt.setHours(trialEndsAt.getHours() - 1);
      }

      user = await this.usersService.create({
        id: clerkId, // Use Clerk ID as Primary Key
        email: email,
        fullName: 'Trader', // Default name, user can update later via profile
        isEmailVerified: true, // Clerk handles verification
        role: role, // Set role from Clerk
        trialEndsAt,
        isEarlySupporter,
        referrer: referredByUserId ? { connect: { id: referredByUserId } } : undefined,
      });

      // Seed default assets for the new user
      await this.assetsService.seedDefaultAssetsForUser(user.id);
      this.logger.log(`User ${clerkId} provisioned successfully. EarlySupporter: ${isEarlySupporter}, TrialEnds: ${trialEndsAt.toISOString()}`);
    } else {
      // Existing user - only update role if provided in JWT (from Clerk)
      const updateData: any = { lastLoginAt: new Date() };

      if (clerkRole) {
        // If Clerk provides role in JWT, sync it
        updateData.role = clerkRole;
        this.logger.log(`User ${clerkId} logged in. Role synced from Clerk: ${clerkRole}`);
      } else {
        // If no role in JWT, keep existing role from database
        this.logger.log(`User ${clerkId} logged in. Keeping existing role: ${user.role}`);
      }

      await this.usersService.update(user.id, updateData);
    }

    return user;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AssetsService } from '../assets/assets.service';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly assetsService: AssetsService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Validates the user from the Clerk Token.
   * If the user does not exist in Prisma, creates them (JIT Provisioning).
   */
  async validateClerkUser(payload: { sub: string; email?: string; name?: string; public_metadata?: any; unsafe_metadata?: any }) {
    const clerkId = payload.sub;
    // Fallback email if not in token (depends on Clerk JWT template settings)
    const email = payload.email || `${clerkId}@clerk.user`;
    // Extract role from Clerk's public_metadata (if present in JWT)
    const clerkRole = payload.public_metadata?.role;

    // Use name from token or fallback to 'Trader'
    let fullName = payload.name || 'Trader';

    // Extract referral code from metadata (could be in public or unsafe depending on how signup passed it)
    const referralCode = payload.unsafe_metadata?.referralCode || payload.public_metadata?.referralCode;

    let user = await this.usersService.findById(clerkId).catch(() => null);

    // Helper to fetch real name from Clerk if needed
    const ensureRealName = async (currentName: string) => {
      if (currentName !== 'Trader') return currentName;

      try {
        const clerkUser = await this.getClerkUserDetails(clerkId);
        if (clerkUser) {
          const first = clerkUser.first_name || '';
          const last = clerkUser.last_name || '';
          const realName = `${first} ${last} `.trim();
          if (realName) return realName;
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch user details from Clerk for ${clerkId}: ${error.message} `);
      }
      return currentName;
    };

    if (!user) {
      // New user - provision with role from Clerk or default to USER
      const role = clerkRole || 'USER';
      this.logger.log(`User ${clerkId} not found in DB.Provisioning with role: ${role}...`);

      // Try to get real name from Clerk API since it's a new user and JWT might miss it
      fullName = await ensureRealName(fullName);

      let isEarlySupporter = false;
      let referredByUserId: string | null = null;
      let trialEndsAt = new Date(); // Default: Trial ends NOW (immediate payment required)

      // Check Referral Code
      if (referralCode) {
        if (referralCode === 'beta2025') {
          isEarlySupporter = true;
          this.logger.log(`User ${clerkId} used beta code.Granting Early Supporter status.`);
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
        fullName: fullName, // Use extracted name
        isEmailVerified: true, // Clerk handles verification
        role: role, // Set role from Clerk
        trialEndsAt,
        isEarlySupporter,
        referrer: referredByUserId ? { connect: { id: referredByUserId } } : undefined,
      });

      // Seed default assets for the new user
      await this.assetsService.seedDefaultAssetsForUser(user.id);
      this.logger.log(`User ${clerkId} provisioned successfully.EarlySupporter: ${isEarlySupporter}, TrialEnds: ${trialEndsAt.toISOString()} `);
    } else {
      // Existing user - update details from token
      const updateData: any = { lastLoginAt: new Date() };

      // Update name if provided in payload and different
      if (payload.name && payload.name !== user.fullName) {
        updateData.fullName = payload.name;
      }
      // If payload doesn't have name, and DB has 'Trader', try to fetch real name
      else if (user.fullName === 'Trader') {
        const realName = await ensureRealName('Trader');
        if (realName !== 'Trader') {
          updateData.fullName = realName;
        }
      }

      if (clerkRole) {
        // If Clerk provides role in JWT, sync it
        updateData.role = clerkRole;
        this.logger.log(`User ${clerkId} logged in.Role synced from Clerk: ${clerkRole} `);
      } else {
        // If no role in JWT, keep existing role from database
        this.logger.log(`User ${clerkId} logged in.Keeping existing role: ${user.role} `);
      }

      await this.usersService.update(user.id, updateData);

      // Fix corrupted email from previous bug (remove space)
      if (user.email && user.email.includes(" @clerk.user")) {
        const fixedEmail = user.email.replace(" @clerk.user", "@clerk.user");
        this.logger.log(`Fixing corrupted email for ${user.id}: ${user.email} -> ${fixedEmail}`);

        await this.usersService.update(user.id, { email: fixedEmail });
        user.email = fixedEmail; // Update local object
      }
    }

    return user;
  }

  private async getClerkUserDetails(userId: string): Promise<any> {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn('CLERK_SECRET_KEY is missing. Cannot fetch user details from Clerk.');
      return null;
    }

    try {
      this.logger.log(`Fetching user details from Clerk for ID: ${userId}`);
      const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${secretKey}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Clerk API error: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Clerk API error: ${response.statusText}`);
      }

      const data = await response.json();
      this.logger.log(`Successfully fetched Clerk user details for ${userId}. Name: ${data.first_name} ${data.last_name}`);
      return data;
    } catch (error) {
      this.logger.error(`Error fetching from Clerk: ${error.message}`);
      return null;
    }
  }
}

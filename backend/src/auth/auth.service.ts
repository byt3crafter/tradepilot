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
      let trialEndsAt = new Date(0); // Trial ends at Epoch (expired immediately)
      trialEndsAt.setHours(trialEndsAt.getHours() - 1);

      // Try to get referral code from API if missing from JWT to avoid race conditions
      let finalReferralCode = referralCode;

      if (!finalReferralCode) {
        try {
          // Fetch full details since JWT might be missing unsafe_metadata
          const clerkDetails = await this.getClerkUserDetails(clerkId);

          // 1. Sync real name if needed
          if (clerkDetails) {
            const first = clerkDetails.first_name || '';
            const last = clerkDetails.last_name || '';
            const realName = `${first} ${last} `.trim();
            if (realName && fullName === 'Trader') {
              fullName = realName;
            }
          }

          // 2. Get referral code
          if (clerkDetails?.unsafe_metadata?.referralCode) {
            finalReferralCode = clerkDetails.unsafe_metadata.referralCode;
            this.logger.log(`Retrieved referral code from Clerk API: ${finalReferralCode}`);
          }
        } catch (e) {
          this.logger.warn(`Failed to fetch extra Clerk details during creation: ${e.message}`);
        }
      }

      if (finalReferralCode) {
        if (finalReferralCode === 'beta2025') {
          isEarlySupporter = true;
          this.logger.log(`User ${clerkId} used beta code. Granting Early Supporter status.`);
        } else {
          const referrer = await this.usersService.findById(finalReferralCode).catch(() => null);
          if (referrer) {
            isEarlySupporter = true;
            referredByUserId = referrer.id;
            this.logger.log(`User ${clerkId} referred by ${referrer.id}. Granting Early Supporter status.`);
          }
        }
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
        updateData.role = clerkRole;
        this.logger.log(`User ${clerkId} logged in.Role synced from Clerk: ${clerkRole} `);
      } else {
        this.logger.log(`User ${clerkId} logged in.Keeping existing role: ${user.role} `);
      }

      // Sync Real Email if we have a placeholder
      if (user.email.includes('@clerk.user')) {
        this.logger.log(`User ${clerkId} has placeholder email (${user.email}). Attempting to fetch real email from Clerk...`);
        try {
          const clerkUser = await this.getClerkUserDetails(clerkId);
          console.log(`[DEBUG] Clerk User Response for ${clerkId}:`, JSON.stringify(clerkUser));

          if (clerkUser && clerkUser.email_addresses?.length > 0) {
            const primaryId = clerkUser.primary_email_address_id;
            const primary = clerkUser.email_addresses.find((e: any) => e.id === primaryId);
            const realEmail = primary ? primary.email_address : clerkUser.email_addresses[0].email_address;

            if (realEmail) {
              updateData.email = realEmail;
              user.email = realEmail; // Update local
              this.logger.log(`Successfully synced real email: ${realEmail}`);
            } else {
              this.logger.warn(`[DEBUG] No email address found in Clerk response for ${clerkId}`);
            }
          } else {
            this.logger.warn(`[DEBUG] Clerk user not found or no email addresses. keys: ${Object.keys(clerkUser || {})}`);
          }
        } catch (err) {
          this.logger.warn(`Could not sync real email: ${err.message}`);
          // Fallback: Fix the space issue if it still exists and we couldn't get real email
          if (user.email.includes(" @clerk.user")) {
            updateData.email = user.email.replace(" @clerk.user", "@clerk.user");
          }
        }
      }

      try {
        await this.usersService.update(user.id, updateData);
      } catch (err) {
        this.logger.error(`Failed to update user ${user.id}: ${err.message}. Conflict likely. Returning user anyway.`);
        // If update fails (e.g. email collision), we mostly care that we return the valid user object so they can login.
        // We might want to try updating WITHOUT the email if that was the issue, but for now just proceed.
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

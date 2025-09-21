import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
// FIX: Removed `implements CanActivate`. The base class `AuthGuard` already implements
// the CanActivate interface. Re-declaring it here forces this class to provide its own
// implementation, which is not the intention and causes type errors in inheriting classes.
export class JwtAccessGuard extends AuthGuard('jwt-access') {}

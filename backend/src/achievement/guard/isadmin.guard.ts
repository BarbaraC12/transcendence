import { Role } from '.prisma/client';
import { applyDecorators, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from 'src/auth/accessToken.guard';
import { RolesGuard } from './roles.guard';

export function IsAdmin(...roles: Role[]) {
  roles;
  return applyDecorators(UseGuards(AccessTokenGuard, RolesGuard));
}

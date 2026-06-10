import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: ('TEACHER' | 'STUDENT')[]) => SetMetadata(ROLES_KEY, roles);

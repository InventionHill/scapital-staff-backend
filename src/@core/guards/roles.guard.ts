import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Check if user exists and has a role
    if (!user) {
      return false;
    }

    // Role fallback and normalization: handle potential nested user or missing role
    const rawRole = user.role || user.userType || (user.user && user.user.role);
    const userRole = rawRole ? String(rawRole).trim().toUpperCase() : null;

    if (!userRole) {
      return false;
    }

    const isAuthorized = requiredRoles.some(
      (role) => role.trim().toUpperCase() === userRole,
    );

    return isAuthorized;
  }
}

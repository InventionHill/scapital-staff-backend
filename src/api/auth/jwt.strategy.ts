import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'supersecret',
    });
  }

  async validate(payload: any) {
    const { sub, userType } = payload;
    let user = null;

    // 1. Try to fetch user based on userType from payload (fast path)
    if (userType === 'SUPER_ADMIN') {
      user = await this.prisma.superAdmin.findUnique({ where: { id: sub } });
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user;
        return {
          ...result,
          userType: 'SUPER_ADMIN',
          role: result.role || 'SUPER_ADMIN',
        };
      }
    }

    if (userType === 'ADMIN') {
      user = await this.prisma.adminUser.findUnique({
        where: { id: sub },
        include: { branch: true },
      });
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user;
        return {
          ...result,
          userType: 'ADMIN',
          role: result.role || 'ADMIN',
          branchName: user.branch?.name || 'N/A',
        };
      }
    }

    if (userType === 'MOBILE') {
      user = await this.prisma.mobileUser.findUnique({
        where: { id: sub },
        include: { branch: true },
      });
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user;
        return {
          ...result,
          userType: 'MOBILE',
          role: result.role || 'USER',
          branchName: user.branch?.name || 'N/A',
        };
      }
    }

    // 2. Sequential fallback search (handles legacy tokens missing userType)
    // Check SuperAdmin first
    const superAdmin = await this.prisma.superAdmin.findUnique({
      where: { id: sub },
    });
    if (superAdmin) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = superAdmin;
      return {
        ...result,
        userType: 'SUPER_ADMIN',
        role: result.role || 'SUPER_ADMIN',
      };
    }

    // Then check AdminUser
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: sub },
      include: { branch: true },
    });
    if (admin) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = admin;
      return {
        ...result,
        userType: 'ADMIN',
        role: result.role || 'ADMIN',
        branchName: admin.branch?.name || 'N/A',
      };
    }

    // Then check MobileUser
    const mobileUser = await this.prisma.mobileUser.findUnique({
      where: { id: sub },
      include: { branch: true },
    });
    if (mobileUser) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = mobileUser;
      return {
        ...result,
        userType: 'MOBILE',
        role: result.role || 'USER',
        branchName: mobileUser.branch?.name || 'N/A',
      };
    }

    return null;
  }
}

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
    let foundUser: any = null;

    // 1. Try to fetch user based on userType from payload (fast path)
    if (userType === 'SUPER_ADMIN') {
      foundUser = await this.prisma.superAdmin.findUnique({
        where: { id: sub },
      });
      if (foundUser) {
        foundUser.userType = 'SUPER_ADMIN';
        foundUser.role = foundUser.role || 'SUPER_ADMIN';
      }
    } else if (userType === 'ADMIN') {
      foundUser = await this.prisma.adminUser.findUnique({
        where: { id: sub },
        include: { branch: true },
      });
      if (foundUser) {
        foundUser.userType = 'ADMIN';
        foundUser.role = foundUser.role || 'ADMIN';
        foundUser.branchName = foundUser.branch?.name || 'N/A';
      }
    } else if (userType === 'MOBILE') {
      foundUser = await this.prisma.mobileUser.findUnique({
        where: { id: sub },
        include: { branch: true },
      });
      if (foundUser) {
        foundUser.userType = 'MOBILE';
        foundUser.role = foundUser.role || 'USER';
        foundUser.branchName = foundUser.branch?.name || 'N/A';
      }
    }

    // 2. Sequential fallback search (handles legacy tokens missing userType)
    if (!foundUser) {
      const superAdmin = await this.prisma.superAdmin.findUnique({
        where: { id: sub },
      });
      if (superAdmin) {
        foundUser = superAdmin;
        foundUser.userType = 'SUPER_ADMIN';
        foundUser.role = foundUser.role || 'SUPER_ADMIN';
      } else {
        const admin = await this.prisma.adminUser.findUnique({
          where: { id: sub },
          include: { branch: true },
        });
        if (admin) {
          foundUser = admin;
          foundUser.userType = 'ADMIN';
          foundUser.role = foundUser.role || 'ADMIN';
          foundUser.branchName = admin.branch?.name || 'N/A';
        } else {
          const mobileUser = await this.prisma.mobileUser.findUnique({
            where: { id: sub },
            include: { branch: true },
          });
          if (mobileUser) {
            foundUser = mobileUser;
            foundUser.userType = 'MOBILE';
            foundUser.role = mobileUser.role || 'USER';
            foundUser.branchName = mobileUser.branch?.name || 'N/A';
          }
        }
      }
    }

    if (!foundUser) return null;

    // Check if account is disabled (for ADMIN and MOBILE users)
    if (foundUser.isEnabled === false) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = foundUser;
    return result;
  }
}

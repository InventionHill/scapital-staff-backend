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
    // 1. Check Admin table
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
    });
    if (admin) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = admin;
      return { ...result, userType: 'ADMIN' };
    }

    // 2. Check Mobile table
    const mobileUser = await this.prisma.mobileUser.findUnique({
      where: { id: payload.sub },
    });
    if (mobileUser) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = mobileUser;
      return { ...result, userType: 'MOBILE' };
    }

    return null;
  }
}

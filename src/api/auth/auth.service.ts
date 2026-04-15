import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.adminUser.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      userType: 'ADMIN',
    };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async loginMobile(data: any) {
    const { mobileNumber, password } = data;

    const user = await this.prisma.mobileUser.findFirst({
      where: { mobileNumber },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token for mobile user
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      userType: 'MOBILE',
    };

    const token = this.jwtService.sign(payload);

    return {
      sub_token: token,
      access_token: token, // Providing both for compatibility
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        mobileNumber: user.mobileNumber,
        userType: 'MOBILE',
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    try {
      const user = await this.prisma.adminUser.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          name: registerDto.name,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;

      // Generate token immediately
      const payload = {
        email: result.email,
        sub: result.id,
        role: result.role,
      };
      return {
        access_token: this.jwtService.sign(payload),
        user: result,
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async findAllAdmins() {
    return this.prisma.adminUser.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async createMobileUser(data: any) {
    if (data.mobileNumber) {
      const existingMobile = await this.prisma.mobileUser.findFirst({
        where: { mobileNumber: data.mobileNumber },
      });
      if (existingMobile)
        throw new ConflictException(
          'Mobile number already registered to another user',
        );
    }

    if (data.username) {
      const existingUser = await this.prisma.mobileUser.findUnique({
        where: { username: data.username },
      });
      if (existingUser)
        throw new ConflictException('Username is already taken');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.mobileUser.create({
      data: {
        name: data.name,
        username: data.username,
        mobileNumber: data.mobileNumber,
        password: hashedPassword,
        role: data.role || 'USER',
      },
    });
  }

  async findAll() {
    return this.prisma.mobileUser.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        mobileNumber: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async resetPassword(id: string, pass: string) {
    const hashedPassword = await bcrypt.hash(pass, 10);
    return this.prisma.mobileUser.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async update(id: string, data: any) {
    if (data.mobileNumber) {
      const existingMobile = await this.prisma.mobileUser.findFirst({
        where: { mobileNumber: data.mobileNumber, id: { not: id } },
      });
      if (existingMobile)
        throw new ConflictException(
          'Mobile number already registered to another user',
        );
    }

    if (data.username) {
      const existingUser = await this.prisma.mobileUser.findFirst({
        where: { username: data.username, id: { not: id } },
      });
      if (existingUser)
        throw new ConflictException('Username is already taken');
    }

    return this.prisma.mobileUser.update({
      where: { id },
      data: {
        name: data.name,
        username: data.username,
        mobileNumber: data.mobileNumber,
        role: data.role,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.mobileUser.delete({
      where: { id },
    });
  }
}

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
    // 1. Check SuperAdmin table
    const superAdmin = await this.prisma.superAdmin.findUnique({
      where: { email },
    });
    if (superAdmin && (await bcrypt.compare(pass, superAdmin.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = superAdmin;
      return {
        ...result,
        userType: 'SUPER_ADMIN',
        role: result.role || 'SUPER_ADMIN',
      };
    }

    // 2. Check AdminUser table
    const admin = await this.prisma.adminUser.findUnique({
      where: { email },
      include: { branch: true },
    });
    if (admin && (await bcrypt.compare(pass, admin.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = admin;
      return {
        ...result,
        userType: 'ADMIN',
        role: result.role || 'ADMIN',
        branchName: admin.branch?.name || 'N/A',
      };
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
      role: user.role, // "SUPER_ADMIN" or "ADMIN"
      userType: user.userType,
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
      include: { branch: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token for mobile user
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role || 'USER',
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
        branchId: user.branchId,
        branchName: user.branch?.name || 'N/A',
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    try {
      const user = await this.prisma.superAdmin.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          name: registerDto.name,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;

      const payload = {
        email: user.email,
        sub: user.id,
        role: user.role || 'SUPER_ADMIN',
        userType: 'SUPER_ADMIN',
      };

      return {
        message: 'Super Admin registered successfully',
        access_token: this.jwtService.sign(payload),
        user: {
          ...result,
          userType: 'SUPER_ADMIN',
          role: user.role || 'SUPER_ADMIN',
        },
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async createAdmin(dto: any) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    try {
      // Find or create branch by name if branchId is not provided
      let branchId = dto.branchId;
      if (!branchId && dto.branchName) {
        const branch = await this.prisma.branch.upsert({
          where: { name: dto.branchName },
          update: {},
          create: { name: dto.branchName },
        });
        branchId = branch.id;
      }

      // Check for uniqueness of Mobile IDs before creating
      if (dto.mobileIds && dto.mobileIds.length > 0) {
        // Manual scan for uniqueness in JSON arrays (MySQL specific logic handled by Prisma)
        for (const mid of dto.mobileIds) {
          const existing = await this.prisma.adminUser.findFirst({
            where: {
              mobileIds: {
                array_contains: mid,
              },
            },
          });
          if (existing) {
            throw new ConflictException(
              `Mobile ID ${mid} is already assigned to another admin`,
            );
          }
        }
      }

      // Check if branch already has an admin
      if (branchId) {
        const existingAdmin = await this.prisma.adminUser.findUnique({
          where: { branchId },
        });
        if (existingAdmin) {
          throw new ConflictException(
            `Branch already has an administrator assigned`,
          );
        }
      }

      const user = await this.prisma.adminUser.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          branchId: branchId,
          role: 'ADMIN',
          mobileIds: dto.mobileIds || [],
        },
        include: {
          branch: true,
        },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch?.name || 'N/A',
        mobileIds: Array.isArray(user.mobileIds) ? user.mobileIds : [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error.code === 'P2002') {
        const target = error.meta?.target || '';
        if (target.includes('email'))
          throw new ConflictException('Email already exists');
        if (target.includes('branchId'))
          throw new ConflictException(
            'This branch already has an administrator',
          );
      }
      throw error;
    }
  }

  async findAllAdmins() {
    const admins = await this.prisma.adminUser.findMany({
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return admins.map((admin) => {
      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        branchId: admin.branchId,
        branchName: (admin as any).branch?.name || 'N/A',
        mobileIds: Array.isArray(admin.mobileIds) ? admin.mobileIds : [],
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      };
    });
  }

  async updateAdmin(id: string, data: any) {
    // Find or create branch by name if provided
    let branchId = data.branchId;
    if (!branchId && data.branchName) {
      const branch = await this.prisma.branch.upsert({
        where: { name: data.branchName },
        update: {},
        create: { name: data.branchName },
      });
      branchId = branch.id;
    }

    // Check for branch uniqueness (excluding current user)
    if (branchId) {
      const existingInBranch = await this.prisma.adminUser.findFirst({
        where: { branchId, id: { not: id } },
      });
      if (existingInBranch) {
        throw new ConflictException(
          `Branch already has another administrator assigned`,
        );
      }
    }

    // Check for mobile ID uniqueness (excluding current user's IDs)
    if (data.mobileIds && data.mobileIds.length > 0) {
      for (const mid of data.mobileIds) {
        const existing = await this.prisma.adminUser.findFirst({
          where: {
            mobileIds: {
              array_contains: mid,
            },
            id: { not: id },
          },
        });
        if (existing) {
          throw new ConflictException(
            `Mobile ID ${mid} is already assigned to another admin`,
          );
        }
      }
    }

    const updateData: any = {
      name: data.name,
      email: data.email,
      branchId: branchId,
      role: data.role || 'ADMIN',
      mobileIds: data.mobileIds,
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await this.prisma.adminUser.update({
      where: { id },
      data: updateData,
      include: { branch: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return {
      ...result,
      branchName: user.branch?.name || 'N/A',
    };
  }

  async removeAdmin(id: string) {
    return this.prisma.adminUser.delete({
      where: { id },
    });
  }

  async createMobileUser(data: any, creator?: any) {
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

    // Auto-assign branch from Admin creator if not explicitly provided
    let branchId = data.branchId;
    if (!branchId && creator?.userType === 'ADMIN') {
      branchId = creator.branchId;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.mobileUser.create({
      data: {
        name: data.name,
        username: data.username,
        mobileNumber: data.mobileNumber,
        password: hashedPassword,
        role: data.role || 'USER',
        branchId: branchId,
      },
    });
  }

  async findAll(user?: any) {
    const where: any = {};

    // Branch isolation for regular admins
    if (user?.userType === 'ADMIN') {
      where.branchId = user.branchId;
    }

    return this.prisma.mobileUser.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        mobileNumber: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
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

  async update(id: string, data: any, creator?: any) {
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

    const updateData: any = {
      name: data.name,
      username: data.username,
      mobileNumber: data.mobileNumber,
      role: data.role,
    };

    // Only allow updating branch if creator is Super Admin or Branch is not set
    if (data.branchId) {
      if (creator?.userType === 'SUPER_ADMIN') {
        updateData.branchId = data.branchId;
      }
    }

    return this.prisma.mobileUser.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    return this.prisma.mobileUser.delete({
      where: { id },
    });
  }
}

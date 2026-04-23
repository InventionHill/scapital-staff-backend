import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-logs/audit-logs.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditLog: AuditLogService,
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
      if (!admin.isEnabled) {
        throw new UnauthorizedException(
          'Your account has been disabled. Please contact support.',
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = admin;
      return {
        ...result,
        userType: 'ADMIN',
        role: result.role || 'ADMIN',
        branchName: admin.branch?.name || 'N/A',
        isEnabled: admin.isEnabled,
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
    const token = this.jwtService.sign(payload);

    // Log the login event
    await this.auditLog.createLog(
      user.id,
      user.userType as any,
      'LOGIN',
      `${user.userType.replace('_', ' ')} logged in: ${user.name} (${user.email})`,
      { branchId: (user as any).branchId },
    );

    return {
      access_token: token,
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

    if (!user.isEnabled) {
      throw new UnauthorizedException(
        'Your account has been disabled. Please contact support.',
      );
    }

    // Generate token for mobile user
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role || 'USER',
      userType: 'MOBILE',
    };

    const token = this.jwtService.sign(payload);

    // Log the login event
    await this.auditLog.createLog(
      user.id,
      'MOBILE',
      'LOGIN',
      `Mobile user logged in: ${user.name} (${user.mobileNumber})`,
      { branchId: user.branchId },
    );

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
        isEnabled: user.isEnabled,
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

      await this.auditLog.createLog(
        'SYSTEM',
        'SUPER_ADMIN',
        'CREATE_ADMIN',
        `Created Admin: ${user.name} (${user.email}) for branch ${user.branch?.name || 'N/A'}`,
        {
          targetId: user.id,
          targetType: 'ADMIN_USER',
          branchId: user.branchId,
        },
      );

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
        isEnabled: admin.isEnabled,
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

    await this.auditLog.createLog(
      'SYSTEM',
      'SUPER_ADMIN',
      'UPDATE_ADMIN',
      `Updated Admin: ${user.name} (${user.email})`,
      { targetId: user.id, targetType: 'ADMIN_USER', branchId: user.branchId },
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return {
      ...result,
      branchName: user.branch?.name || 'N/A',
    };
  }

  async removeAdmin(id: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    const res = await this.prisma.adminUser.delete({
      where: { id },
    });
    if (admin) {
      await this.auditLog.createLog(
        'SYSTEM',
        'SUPER_ADMIN',
        'DELETE_ADMIN',
        `Deleted Admin: ${admin.name} (${admin.email})`,
        { targetId: id, targetType: 'ADMIN_USER', branchId: admin.branchId },
      );
    }
    return res;
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
    const user = await this.prisma.mobileUser.create({
      data: {
        name: data.name,
        username: data.username,
        mobileNumber: data.mobileNumber,
        password: hashedPassword,
        role: data.role || 'USER',
        branchId: branchId,
      },
    });

    if (creator) {
      await this.auditLog.createLog(
        creator.id,
        creator.userType as any,
        'CREATE_MOBILE_USER',
        `Created Mobile User: ${user.name || user.username} (${user.mobileNumber || 'N/A'})`,
        {
          targetId: user.id,
          targetType: 'MOBILE_USER',
          branchId: user.branchId,
        },
      );
    }

    return user;
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
        isEnabled: true,
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

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    // Only allow updating branch if creator is Super Admin or Branch is not set
    if (data.branchId) {
      if (creator?.userType === 'SUPER_ADMIN') {
        updateData.branchId = data.branchId;
      }
    }

    const user = await this.prisma.mobileUser.update({
      where: { id },
      data: updateData,
    });

    if (creator) {
      await this.auditLog.createLog(
        creator.id,
        creator.userType as any,
        'UPDATE_MOBILE_USER',
        `Updated Mobile User: ${user.name || user.username}`,
        {
          targetId: user.id,
          targetType: 'MOBILE_USER',
          branchId: user.branchId,
        },
      );
    }

    return user;
  }

  async remove(id: string) {
    const user = await this.prisma.mobileUser.findUnique({ where: { id } });
    const res = await this.prisma.mobileUser.delete({
      where: { id },
    });
    if (user) {
      await this.auditLog.createLog(
        'SYSTEM', // We don't have creator here in the method signature, but usually it's the current admin
        'ADMIN',
        'DELETE_MOBILE_USER',
        `Deleted Mobile User: ${user.name || user.username}`,
        { targetId: id, targetType: 'MOBILE_USER', branchId: user.branchId },
      );
    }
    return res;
  }

  async getAdminMobileUsers(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      include: { branch: true },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (!admin.branchId) {
      return {
        admin: {
          id: admin.id,
          name: admin.name,
          branchId: admin.branchId,
          branchName: admin.branch?.name || 'N/A',
        },
        mobileUsers: [],
      };
    }

    const users = await this.prisma.mobileUser.findMany({
      where: { branchId: admin.branchId },
      include: {
        _count: {
          select: { leads: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const [followUpsCount, newLeadsCount, closedLeadsCount] =
          await Promise.all([
            this.prisma.lead.count({
              where: { assignedToId: user.id, status: 'FOLLOW_UP' },
            }),
            this.prisma.lead.count({
              where: { assignedToId: user.id, status: 'NEW' },
            }),
            this.prisma.lead.count({
              where: { assignedToId: user.id, status: 'CLOSED' },
            }),
          ]);

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          mobileNumber: user.mobileNumber,
          createdAt: user.createdAt,
          totalLeads: user._count.leads,
          totalFollowUps: followUpsCount,
          totalNewLeads: newLeadsCount,
          totalClosedLeads: closedLeadsCount,
        };
      }),
    );

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        branchId: admin.branchId,
        branchName: admin.branch?.name || 'N/A',
      },
      mobileUsers: usersWithStats,
    };
  }

  async toggleAdminStatus(id: string, isEnabled: boolean, actor: any) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    const updated = await this.prisma.adminUser.update({
      where: { id },
      data: { isEnabled },
    });

    await this.auditLog.createLog(
      actor.id,
      actor.userType,
      isEnabled ? 'ENABLE_ADMIN' : 'DISABLE_ADMIN',
      `${isEnabled ? 'Enabled' : 'Disabled'} Admin: ${admin.name} (${admin.email})`,
      { targetId: id, targetType: 'ADMIN_USER', branchId: admin.branchId },
    );

    return updated;
  }

  async toggleMobileUserStatus(id: string, isEnabled: boolean, actor: any) {
    const user = await this.prisma.mobileUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Mobile user not found');

    const updated = await this.prisma.mobileUser.update({
      where: { id },
      data: { isEnabled },
    });

    await this.auditLog.createLog(
      actor.id,
      actor.userType,
      isEnabled ? 'ENABLE_MOBILE_USER' : 'DISABLE_MOBILE_USER',
      `${isEnabled ? 'Enabled' : 'Disabled'} Mobile User: ${user.name || user.username}`,
      { targetId: id, targetType: 'MOBILE_USER', branchId: user.branchId },
    );

    return updated;
  }
}

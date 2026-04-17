import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getGlobalOverview() {
    const totalLeads = await this.prisma.lead.count();
    const leadsByStatus = await this.prisma.lead.groupBy({
      by: ['status'],
      _count: true,
    });

    const totalCalls = await this.prisma.callLog.count();
    const totalAdmins = await this.prisma.adminUser.count();
    const totalSuperAdmins = await this.prisma.superAdmin.count();
    const totalMobileUsers = await this.prisma.mobileUser.count();
    const totalBranches = await this.prisma.branch.count();

    const branchPerformance = await this.prisma.branch.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            leads: true,
            mobileUsers: true,
          },
        },
      },
    });

    return {
      totals: {
        leads: totalLeads,
        calls: totalCalls,
        admins: totalAdmins,
        superAdmins: totalSuperAdmins,
        mobileUsers: totalMobileUsers,
        branches: totalBranches,
      },
      leadsByStatus: leadsByStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      branchOverview: branchPerformance,
    };
  }
}

/*
- [x] **Phase 1: Database Refactoring**
    - [x] Create `SuperAdmin` model in `schema.prisma`
    - [x] Remove `SUPER_ADMIN` role from `AdminUser` model
    - [x] Update `seed-admin.ts` to use separate models
    - [x] Regenerate Prisma client
- [x] **Phase 2: Authentication Logic Refactor**
    - [x] Update `AuthService` with dedicated Super Admin login logic
    - [x] Refactor `register` to create `SuperAdmin` entries
    - [x] Implement `createAdmin` for Super Admins to create `AdminUser` entries
    - [x] Update `JwtStrategy` to distinguish between `SuperAdmin` and `AdminUser`
- [x] **Phase 3: Controller & API Updates**
    - [x] Create dedicated login endpoints in `AuthController`
    - [x] Setup restricted admin-creation endpoint for Super Admins
    - [x] Update dashboard analytics to handle the new table structure
- [x] **Phase 4: Documentation (Postman)**
    - [x] Update Postman collection with separate login examples for Super Admin and regular Admin
- [ ] **Phase 5: Verification**
*/

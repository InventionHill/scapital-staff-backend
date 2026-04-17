import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../@core/decorators/roles.decorator';
import { RolesGuard } from '../../@core/guards/roles.guard';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles('SUPER_ADMIN')
  @Get('overview')
  getOverview() {
    return this.dashboardService.getGlobalOverview();
  }
}

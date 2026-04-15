import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MobileDashboardService } from './mobile-dashboard.service';

@Controller('mobile-dashboard')
@UseGuards(AuthGuard('jwt'))
export class MobileDashboardController {
  constructor(private readonly dashboardService: MobileDashboardService) {}

  @Get('home')
  async getHomeData(@Request() req) {
    return this.dashboardService.getHomeData(req.user);
  }
}

import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MobileLoginDto } from './dto/mobile-login.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../@core/decorators/roles.decorator';
import { RolesGuard } from '../../@core/guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('users/login')
  async loginMobile(@Body() data: MobileLoginDto) {
    return this.authService.loginMobile(data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('users')
  async createMobileUser(@Body() data: any, @Request() req: any) {
    return this.authService.createMobileUser(data, req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('users')
  async findAll(@Request() req: any) {
    return this.authService.findAll(req.user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('admins')
  async findAllAdmins() {
    return this.authService.findAllAdmins();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('debug-me')
  debugMe(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('users/:id/reset-password')
  async resetPassword(@Param('id') id: string, @Body('password') pass: string) {
    return this.authService.resetPassword(id, pass);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('users/:id')
  async update(
    @Param('id') id: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    return this.authService.update(id, data, req.user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('admins')
  async createAdmin(@Body() dto: any) {
    return this.authService.createAdmin(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch('admins/:id')
  async updateAdmin(@Param('id') id: string, @Body() data: any) {
    return this.authService.updateAdmin(id, data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete('admins/:id')
  async removeAdmin(@Param('id') id: string) {
    return this.authService.removeAdmin(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('users/:id')
  async remove(@Param('id') id: string) {
    return this.authService.remove(id);
  }
}

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
  async createMobileUser(@Body() data: any) {
    return this.authService.createMobileUser(data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('users')
  async findAll() {
    return this.authService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
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
  @Patch('users/:id/reset-password')
  async resetPassword(@Param('id') id: string, @Body('password') pass: string) {
    return this.authService.resetPassword(id, pass);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('users/:id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.authService.update(id, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('users/:id')
  async remove(@Param('id') id: string) {
    return this.authService.remove(id);
  }
}

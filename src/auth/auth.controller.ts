import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { SignInDto } from './dto/signin.dto';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RefreshTokenFilter } from './filters/refresh-token.filter';
import { RequestWithUserAndRefreshToken } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(readonly authService: AuthService) {}

  setRefreshTokenCookie(response: Response, refreshToken: string) {
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  @Post('signin')
  async signIn(
    @Body() user: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userData = await this.authService.signIn(user);

    const { accessToken, refreshToken } = await this.authService.generateJwts(
      userData.id,
    );
    await this.authService.saveRefreshToken(userData.id, refreshToken);
    this.setRefreshTokenCookie(response, refreshToken);

    return { ...userData, accessToken };
  }

  @Post('signup')
  async signUp(
    @Body() user: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userData = await this.authService.signUp(user);

    const { accessToken, refreshToken } = await this.authService.generateJwts(
      userData.id,
    );
    await this.authService.saveRefreshToken(userData.id, refreshToken);
    this.setRefreshTokenCookie(response, refreshToken);

    return { ...userData, accessToken };
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt-access'))
  async logout(
    @Req() request: RequestWithUserAndRefreshToken,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.invalidateToken(request.user.userId);
    response.clearCookie('refreshToken', { path: '/auth/refresh' });
    return { message: 'Logged out' };
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @UseFilters(RefreshTokenFilter)
  async refreshToken(
    @Req() request: RequestWithUserAndRefreshToken,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.generateJwts(
      request.user.userId,
    );
    await this.authService.saveRefreshToken(request.user.userId, refreshToken);
    this.setRefreshTokenCookie(response, refreshToken);

    const userData = await this.authService.getUserById(request.user.userId);

    return { ...userData, accessToken };
  }
}

import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { SignInDto } from './dto/signin.dto';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(readonly authService: AuthService) {}

  setRefreshTokenCookie(response: Response, refreshToken: string) {
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh-token',
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
}

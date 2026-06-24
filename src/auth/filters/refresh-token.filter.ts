import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';

@Catch(UnauthorizedException)
export class RefreshTokenFilter implements ExceptionFilter {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  async catch(_exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const refreshToken = request.cookies?.refreshToken;

    if (refreshToken) {
      const payload = this.jwtService.decode(refreshToken) as {
        sub: string;
      } | null;
      if (payload?.sub) {
        await this.authService.invalidateToken(payload.sub);
      }
      response.clearCookie('refreshToken', { path: '/auth/refresh' });
    }

    response.status(401).json({ message: 'Unauthorized' });
  }
}

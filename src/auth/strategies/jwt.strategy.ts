import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';
import { compareHash } from '../utils/hash';

export interface RequestWithUserAndRefreshToken extends Request {
  user: {
    userId: string;
    refreshToken?: string;
  };
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: any) {
    return { userId: payload.sub };
  }
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies['refreshToken'],
      ]),
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const rawToken = req.cookies['refreshToken'];
    const user = await this.usersService.getUserBy({ id: payload.sub });

    if (!user?.tokenHash || !(await compareHash(rawToken, user.tokenHash))) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    return { userId: payload.sub, refreshToken: rawToken };
  }
}

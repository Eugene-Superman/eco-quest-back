import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { SignInDto } from './dto/signin.dto';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiration } from './enums/token-expiration';
import { compareHash, hash } from './utils/hash';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    readonly usersService: UsersService,
    readonly jwtService: JwtService,
  ) {}

  private mapUserToResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      nickname: user.nickname,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async generateAccessToken(userId: string) {
    const payload = { sub: userId };

    return await this.jwtService.signAsync(payload, {
      expiresIn: TokenExpiration.ACCESS,
      secret: process.env.JWT_ACCESS_SECRET,
    });
  }

  async generateRefreshToken(userId: string) {
    const payload = { sub: userId };

    return await this.jwtService.signAsync(payload, {
      expiresIn: TokenExpiration.REFRESH,
      secret: process.env.JWT_REFRESH_SECRET,
    });
  }

  async generateJwts(userId: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId),
      this.generateRefreshToken(userId),
    ]);

    return { accessToken, refreshToken };
  }

  async saveRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = await hash(refreshToken);
    return await this.usersService.updateUser(userId, { tokenHash });
  }

  async signIn(user: SignInDto) {
    const existingUser = await this.usersService.getUserByEmail(user.email);
    const areCredentialsValid = existingUser
      ? await compareHash(user.password, existingUser.password)
      : false;

    if (!areCredentialsValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.mapUserToResponse(existingUser);
  }

  async signUp(user: CreateUserDto) {
    try {
      const hashedPassword = await hash(user.password);

      const savedUser = await this.usersService.createUser({
        ...user,
        password: hashedPassword,
      });
      return this.mapUserToResponse(savedUser);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User with this email already exists');
      }

      throw error;
    }
  }

  async getUserById(userId: string) {
    const user = await this.usersService.getUserBy({ id: userId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToResponse(user);
  }

  async invalidateToken(userId: string) {
    await this.usersService.updateUser(userId, { tokenHash: null });
  }
}

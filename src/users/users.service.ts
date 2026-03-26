import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: CreateUserDto) {
    return await this.prisma.user.create({
      data,
    });
  }

  async getUserByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    await this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async getAllUsers() {
    return await this.prisma.user.findMany();
  }
}

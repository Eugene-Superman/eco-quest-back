import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Post('create')
  async createUser(@Body() dto: CreateUserDto) {
    await this.userService.createUser(dto);
    return 'User created';
  }

  @Get('get-all')
  async getAllUsers() {
    return await this.userService.getAllUsers();
  }
}

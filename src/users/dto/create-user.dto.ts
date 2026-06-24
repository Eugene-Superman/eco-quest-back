import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { userConstants } from '../constants';

export class CreateUserDto {
  @IsEmail()
  readonly email: string;

  @IsString()
  @MinLength(userConstants.minPasswordLength)
  readonly password: string;

  @IsString()
  @IsOptional()
  readonly fullname?: string;

  @IsString()
  readonly nickname: string;
}

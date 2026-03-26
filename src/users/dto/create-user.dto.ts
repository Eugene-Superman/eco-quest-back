import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../enums/role.enum';
import { userConstants } from '../constants';

export class CreateUserDto {
  @IsEmail()
  readonly email: string;

  @IsString()
  @MinLength(userConstants.minPasswordLength)
  readonly password: string;

  @IsString()
  @IsOptional()
  readonly fullname: string;

  @IsString()
  readonly nickname: string;

  @IsEnum(UserRole)
  readonly role: UserRole;
}

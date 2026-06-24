import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../enums/role.enum';
import { userConstants } from '../constants';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  readonly email?: string;

  @IsString()
  @MinLength(userConstants.minPasswordLength)
  @IsOptional()
  readonly password?: string;

  @IsString()
  @IsOptional()
  readonly fullname?: string;

  @IsString()
  @IsOptional()
  readonly nickname?: string;

  @IsEnum(UserRole)
  @IsOptional()
  readonly role?: UserRole;
}

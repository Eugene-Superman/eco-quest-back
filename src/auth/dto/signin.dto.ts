import { IsEmail, IsString, MinLength } from 'class-validator';
import { userConstants } from 'src/users/constants';

export class SignInDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(userConstants.minPasswordLength)
  password: string;
}

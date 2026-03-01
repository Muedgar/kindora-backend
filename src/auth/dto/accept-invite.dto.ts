import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { WEAK_PASSWORD } from '../messages';
import { Match } from '../decorators';

export class AcceptInviteDto {
  @ApiProperty({ description: 'Signed invite JWT from the invitation email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Chosen password (min 12 chars, must be strong)' })
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).+$/, {
    message: WEAK_PASSWORD,
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({ description: 'Must match password' })
  @Match('password', { message: 'Passwords do not match' })
  @IsNotEmpty()
  @IsString()
  confirmPassword: string;
}

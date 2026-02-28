import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { WEAK_PASSWORD } from '../messages';
import { Match } from '../decorators';

export class AcceptInviteDto {
  @ApiProperty({ description: 'Signed invite JWT from the invitation email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Chosen password (must be strong)' })
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

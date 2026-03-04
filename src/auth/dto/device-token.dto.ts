import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  @MinLength(8)
  @MaxLength(1024)
  token: string;

  @IsIn(['ios', 'android'])
  platform: 'ios' | 'android';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  provider?: string;
}

export class RemoveDeviceTokenDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(1024)
  token?: string;
}

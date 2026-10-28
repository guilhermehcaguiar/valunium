import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, Length, Matches, ValidateIf } from 'class-validator';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @Length(3, 254) email!: string;
  @IsString() @Length(12, 128) password!: string;
}
export class RegisterDto extends LoginDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 100) name!: string;
}
export class ForgotPasswordDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @Length(3, 254) email!: string;
}
export class ResetPasswordDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) token!: string;
  @IsString() @Length(12, 128) password!: string;
}
export class ChangePasswordDto {
  @IsString() @Length(12, 128) currentPassword!: string;
  @IsString() @Length(12, 128) password!: string;
}
export class ProfileDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 100) name?: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsIn(['pt-BR', 'en-US']) locale?: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsIn(['America/Sao_Paulo', 'UTC']) timeZone?: string;
}

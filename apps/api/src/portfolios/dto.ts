import { Transform } from 'class-transformer';
import { IsIn, ValidateIf, IsString, Length, MaxLength } from 'class-validator';
export class CreatePortfolioDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 100) name!: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined) @IsString() @MaxLength(1000) description?: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined) @IsIn(['BRL']) baseCurrency?: 'BRL';
}
export class UpdatePortfolioDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 100) name?: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined) @IsString() @MaxLength(1000) description?: string;
}

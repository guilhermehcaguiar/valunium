import { IsString, Length, IsIn, IsUUID, Matches, IsInt, Min, IsBoolean, ValidateIf } from 'class-validator';
export class AssetDto {
 @IsString() @Matches(/^[A-Z0-9]{3,20}$/) ticker!: string;
 @IsString() @Length(1,150) name!: string;
 @IsIn(['STOCK','FII','ETF','BDR']) assetClass!: string;
 @IsString() @Length(1,300) source!: string;
}
export class AssetUpdateDto {
 @IsString() @Matches(/^[A-Z0-9]{3,20}$/) ticker!: string;
 @IsString() @Length(1,150) name!: string;
 @IsBoolean() active!: boolean;
 @IsString() @Length(1,300) source!: string;
}
export class EventDto {
 @IsUUID() assetId!: string;
 @IsIn(['BUY','SELL','DIVIDEND','JCP','OTHER']) kind!: string;
 @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
 @IsString() @Length(1,40) quantity!: string;
 @IsString() @Length(1,40) unitPrice!: string;
 @IsString() @Length(1,40) fees!: string;
 @IsString() @Length(1,40) gross!: string;
 @IsString() @Length(1,40) withholding!: string;
 @IsString() @Length(0,1000) note!: string;
 @IsUUID() requestKey!: string;
 @ValidateIf((_o: unknown,v: unknown)=>v!==undefined) @IsInt() @Min(1) version?: number;
 @ValidateIf((_o: unknown,v: unknown)=>v!==undefined) @IsString() @Length(1,500) reason?: string;
}
export class CancelDto {
 @IsInt() @Min(1) version!: number;
 @IsString() @Length(1,500) reason!: string;
}
export class LimitationDto {
 @IsBoolean() incomplete!: boolean;
 @IsString() @Length(1,500) reason!: string;
}

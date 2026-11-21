import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { ReportReason } from '@prisma/client';

export class CreateReportDto {
  @IsEnum(ReportReason)
  raison: ReportReason;

  @IsString()
  @IsNotEmpty()
  description: string | undefined;
}

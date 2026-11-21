import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateCommentDto {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsString()
  @IsNotEmpty()
  contenu!: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}

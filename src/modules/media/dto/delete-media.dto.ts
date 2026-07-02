import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class DeleteMediaDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  publicIds: string[];
}

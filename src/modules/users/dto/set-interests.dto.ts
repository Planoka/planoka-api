import { IsArray, IsString } from 'class-validator';

export class SetInterestsDto {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsArray()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsString({ each: true })
  categoryIds: string[];
}

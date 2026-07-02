import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DeleteMediaDto } from './dto/delete-media.dto';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiBearerAuth('Clerk JWT')
@Controller('upload')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file')) // Le champ du formulaire doit s'appeler 'file'
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    
    // Vérification basique du type de fichier (image ou vidéo)
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      throw new BadRequestException('Le fichier doit être une image ou une vidéo');
    }

    return this.mediaService.uploadMedia(file);
  }

  @Post('delete')
  async deleteMedia(@Body() body: DeleteMediaDto) {
    return this.mediaService.deleteMedia(body.publicIds);
  }
}

import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';

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

    const url = await this.mediaService.uploadMedia(file);
    return { url };
  }
}

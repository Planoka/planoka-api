import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class MediaService {
  constructor() {
    // Le SDK Cloudinary détecte automatiquement la variable d'environnement CLOUDINARY_URL
  }

  async uploadMedia(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: 'planoka', resource_type: 'auto' },
        (error, result) => {
          if (error) return reject(new InternalServerErrorException('Erreur Cloudinary'));
          if (!result) return reject(new InternalServerErrorException('Pas de résultat Cloudinary'));
          resolve(result.secure_url);
        },
      );

      // Convertir le buffer du fichier en stream lisible pour Cloudinary
      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      
      readableStream.pipe(upload);
    });
  }
}

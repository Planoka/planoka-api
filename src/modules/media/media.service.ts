import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class MediaService {
  constructor() {
    // La configuration Cloudinary se base sur les variables d'environnement
    // CLOUDINARY_URL ou CLOUDINARY_CLOUD_NAME, etc.
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
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

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // Retourne toutes les catégories triées par ordre alphabétique
    return this.prisma.category.findMany({
      orderBy: { nomFr: 'asc' },
    });
  }
}

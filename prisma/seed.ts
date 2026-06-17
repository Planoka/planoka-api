import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding des 8 catégories Planoka...');

  const categories = [
    { nomFr: 'Restauration', nomEn: 'Restaurants', slug: 'restauration', icone: '🍽️', couleur: '#FF6B35' },
    { nomFr: 'Loisirs',      nomEn: 'Leisure',     slug: 'loisirs',      icone: '🎮', couleur: '#4ECDC4' },
    { nomFr: 'Sorties',      nomEn: 'Nightlife',   slug: 'sorties',      icone: '🎉', couleur: '#9B59B6' },
    { nomFr: 'Culture',      nomEn: 'Culture',     slug: 'culture',      icone: '🎭', couleur: '#3498DB' },
    { nomFr: 'Sport',        nomEn: 'Sports',      slug: 'sport',        icone: '⚽', couleur: '#2ECC71' },
    { nomFr: 'Voyages',      nomEn: 'Travel',      slug: 'voyages',      icone: '✈️', couleur: '#E74C3C' },
    { nomFr: 'Shopping',     nomEn: 'Shopping',    slug: 'shopping',     icone: '🛍️', couleur: '#F39C12' },
    { nomFr: 'Bien-être',    nomEn: 'Wellness',    slug: 'bien-etre',    icone: '🧘', couleur: '#1ABC9C' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    console.log(`  ✅ ${cat.nomFr}`);
  }

  console.log('\n✨ Seed terminé ! Les 8 catégories sont disponibles.');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

  // Seeding du compte administrateur initial (si inexistant)
  console.log('\n👑 Seeding du compte administrateur...');
  const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@planoka.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'AdminPlanoka2025!';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        nom: 'Administrateur Principal',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        ville: 'Paris',
      },
    });
    console.log(`  ✅ Compte Admin créé: ${adminEmail}`);
  } else {
    // S'assurer qu'il a bien le rôle ADMIN et un passwordHash
    if (existingAdmin.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { role: 'ADMIN' },
      });
      console.log(`  ✅ Rôle ADMIN rétabli pour: ${adminEmail}`);
    } else {
      console.log(`  ℹ️ Compte Admin déjà existant: ${adminEmail}`);
    }
  }

  console.log('\n✨ Seed terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

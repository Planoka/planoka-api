import { PrismaClient, Role, PlanStatus, ReportReason } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Début du test global des fonctionnalités (Seed)...');

  // 1. Nettoyage (Optionnel - Pour repartir de zéro dans le test)
  // await prisma.user.deleteMany(); 

  // 2. Test Users & Roles
  const admin = await prisma.user.upsert({
    where: { email: 'admin@planoka.com' },
    update: { role: Role.ADMIN },
    create: {
      clerkId: 'clerk_admin_test',
      nom: 'Admin Planoka',
      email: 'admin@planoka.com',
      role: Role.ADMIN,
    },
  });
  console.log('✅ Utilisateur Admin vérifié:', admin.email);

  const user = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      clerkId: 'clerk_user_test',
      nom: 'Testeur Planoka',
      email: 'user@test.com',
      role: Role.USER,
      ville: 'Paris',
    },
  });
  console.log('✅ Utilisateur Standard vérifié:', user.email);

  // 3. Test Catégories
  const rando = await prisma.category.upsert({
    where: { slug: 'randonnee' },
    update: {},
    create: {
      nomFr: 'Randonnée',
      nomEn: 'Hiking',
      slug: 'randonnee',
      icone: 'hiking',
      couleur: '#4CAF50',
    },
  });
  console.log('✅ Catégorie vérifiée:', rando.nomFr);

  // 4. Test Plans (Multi-images)
  const plan = await prisma.plan.create({
    data: {
      titre: 'Escapade au Mont Blanc',
      description: 'Un itinéraire magnifique de 3 jours.',
      ville: 'Chamonix',
      images: [
        'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        'https://res.cloudinary.com/demo/image/upload/sample2.jpg'
      ],
      userId: user.id,
      categorieId: rando.id,
      status: PlanStatus.ACTIVE,
    },
  });
  console.log('✅ Création Plan (Multi-images) réussie:', plan.titre);

  // 5. Test Interactions (Boost & Favorite)
  await prisma.boost.upsert({
    where: { planId_userId: { planId: plan.id, userId: admin.id } },
    update: {},
    create: { planId: plan.id, userId: admin.id },
  });
  
  await prisma.plan.update({
    where: { id: plan.id },
    data: { boostsCount: { increment: 1 } },
  });
  console.log('✅ Interaction Boost réussie');

  await prisma.favorite.upsert({
    where: { userId_planId: { userId: user.id, planId: plan.id } },
    update: {},
    create: { userId: user.id, planId: plan.id },
  });
  console.log('✅ Interaction Favori réussie');

  // 6. Test Commentaires
  const comment = await prisma.comment.create({
    data: {
      contenu: 'Superbe plan ! Merci pour le partage.',
      planId: plan.id,
      userId: admin.id,
    },
  });
  console.log('✅ Création Commentaire réussie');

  // 7. Test Signalement (Modération)
  const report = await prisma.report.create({
    data: {
      planId: plan.id,
      userId: user.id,
      raison: ReportReason.AUTRE,
      description: 'Test de signalement automatique.',
    },
  });
  console.log('✅ Création Signalement réussie');

  console.log('\n✨ TEST GLOBAL RÉUSSI !');
  console.log('L\'infrastructure de la base de données et les relations sont intègres.');
}

main()
  .catch((e) => {
    console.error('❌ Erreur durant le test global:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

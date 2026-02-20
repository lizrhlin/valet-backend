import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Recalculando ratings de todos os usuários...\n');

  // Buscar todas as reviews existentes
  const allReviews = await prisma.review.findMany({
    select: { id: true, fromUserId: true, roleFrom: true, toUserId: true, roleTo: true, rating: true },
  });
  console.log(`📊 Total de reviews no banco: ${allReviews.length}`);
  for (const r of allReviews) {
    console.log(`  - Review ${r.id}: from=${r.fromUserId} (${r.roleFrom}) → to=${r.toUserId} (${r.roleTo}) rating=${r.rating}`);
  }

  // Buscar todos os profissionais
  const professionals = await prisma.user.findMany({
    where: { userType: 'PROFESSIONAL' },
    select: { id: true, name: true },
  });

  console.log(`\n👷 Recalculando ${professionals.length} profissionais...`);
  for (const prof of professionals) {
    const profReviews = await prisma.review.findMany({
      where: { toUserId: prof.id, roleTo: 'PROFESSIONAL' },
      select: { rating: true },
    });

    const avgRating = profReviews.length > 0
      ? profReviews.reduce((sum, r) => sum + r.rating, 0) / profReviews.length
      : 0;

    await prisma.professionalProfile.update({
      where: { userId: prof.id },
      data: {
        ratingAvg: Math.round(avgRating * 10) / 10,
        reviewCount: profReviews.length,
      },
    });

    console.log(`  ✅ ${prof.name}: ratingAvg=${Math.round(avgRating * 10) / 10}, reviewCount=${profReviews.length}`);
  }

  // Buscar todos os usuários para recalcular rating como cliente
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, userType: true },
  });

  console.log(`\n👤 Recalculando client ratings para ${allUsers.length} usuários...`);
  for (const user of allUsers) {
    const clientReviews = await prisma.review.findMany({
      where: { toUserId: user.id, roleTo: 'CLIENT' },
      select: { rating: true },
    });

    const clientAvg = clientReviews.length > 0
      ? clientReviews.reduce((sum, r) => sum + r.rating, 0) / clientReviews.length
      : 0;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        clientRatingAvg: Math.round(clientAvg * 10) / 10,
        clientReviewCount: clientReviews.length,
      },
    });

    if (clientReviews.length > 0) {
      console.log(`  ✅ ${user.name} (${user.userType}): clientRatingAvg=${Math.round(clientAvg * 10) / 10}, clientReviewCount=${clientReviews.length}`);
    }
  }

  console.log('\n🎉 Recálculo concluído!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recalculateUserRatings() {
  console.log('🔄 Recalculando ratings dos usuários...\n');

  // Buscar todos os usuários
  const users = await prisma.user.findMany({
    select: { id: true, name: true, userType: true }
  });

  for (const user of users) {
    // Buscar todas as avaliações RECEBIDAS por este usuário
    const receivedReviews = await prisma.review.findMany({
      where: { toUserId: user.id },
      select: { rating: true }
    });

    if (receivedReviews.length > 0) {
      // Calcular média
      const totalRating = receivedReviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / receivedReviews.length;

      // Atualizar usuário
      await prisma.user.update({
        where: { id: user.id },
        data: {
          rating: averageRating,
          reviewCount: receivedReviews.length
        }
      });

      console.log(`✅ ${user.name} (${user.userType}): ${averageRating.toFixed(1)} ⭐ (${receivedReviews.length} avaliações)`);
    } else {
      // Garantir que usuários sem avaliações tenham rating 0
      await prisma.user.update({
        where: { id: user.id },
        data: {
          rating: 0,
          reviewCount: 0
        }
      });

      console.log(`   ${user.name} (${user.userType}): Sem avaliações`);
    }
  }

  console.log('\n✨ Ratings recalculados com sucesso!');
}

recalculateUserRatings()
  .catch((error) => {
    console.error('❌ Erro ao recalcular ratings:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

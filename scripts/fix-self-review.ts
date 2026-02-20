import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Corrigir a self-review: toUserId deveria ser o clientId do appointment
  const review = await prisma.review.findUnique({
    where: { id: 'cmlu5wjg50001wzhwvy5x6wtx' },
  });

  if (!review) {
    console.log('❌ Review não encontrada');
    return;
  }

  console.log('📋 Review atual:', JSON.stringify(review, null, 2));

  const apt = await prisma.appointment.findUnique({
    where: { id: review.appointmentId },
    select: { clientId: true, professionalId: true },
  });

  if (!apt) {
    console.log('❌ Appointment não encontrado');
    return;
  }

  console.log('📋 Appointment:', JSON.stringify(apt, null, 2));

  // Verificar se é self-review
  if (review.fromUserId === review.toUserId) {
    console.log('⚠️  Self-review detectada! Corrigindo...');
    
    // O profissional (fromUserId) avaliou a si mesmo em vez do cliente
    // O toUserId correto é o clientId do appointment
    const correctToUserId = apt.clientId;
    
    console.log(`🔄 Atualizando toUserId: ${review.toUserId} → ${correctToUserId}`);
    
    await prisma.review.update({
      where: { id: review.id },
      data: { toUserId: correctToUserId },
    });
    
    console.log('✅ Review corrigida!');
  } else {
    console.log('✅ Review não é self-review, nenhuma correção necessária');
  }

  // 2. Recalcular ratings de TODOS os usuários
  console.log('\n🔄 Recalculando ratings...');

  // Profissionais
  const professionals = await prisma.user.findMany({
    where: { userType: 'PROFESSIONAL' },
    select: { id: true, name: true },
  });

  for (const prof of professionals) {
    const profReviews = await prisma.review.findMany({
      where: { toUserId: prof.id, roleTo: 'PROFESSIONAL' },
      select: { rating: true },
    });

    const avg = profReviews.length > 0
      ? profReviews.reduce((sum, r) => sum + r.rating, 0) / profReviews.length
      : 0;

    await prisma.professionalProfile.updateMany({
      where: { userId: prof.id },
      data: {
        ratingAvg: Math.round(avg * 10) / 10,
        reviewCount: profReviews.length,
      },
    });

    console.log(`  👷 ${prof.name}: ratingAvg=${Math.round(avg * 10) / 10}, reviewCount=${profReviews.length}`);
  }

  // Todos os usuários (client rating)
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, userType: true },
  });

  for (const u of allUsers) {
    const clientReviews = await prisma.review.findMany({
      where: { toUserId: u.id, roleTo: 'CLIENT' },
      select: { rating: true },
    });

    const clientAvg = clientReviews.length > 0
      ? clientReviews.reduce((sum, r) => sum + r.rating, 0) / clientReviews.length
      : 0;

    await prisma.user.update({
      where: { id: u.id },
      data: {
        clientRatingAvg: Math.round(clientAvg * 10) / 10,
        clientReviewCount: clientReviews.length,
      },
    });

    if (clientReviews.length > 0) {
      console.log(`  👤 ${u.name} (${u.userType}): clientRatingAvg=${Math.round(clientAvg * 10) / 10}, clientReviewCount=${clientReviews.length}`);
    }
  }

  // Verificar resultado final
  console.log('\n📊 Reviews finais:');
  const allReviews = await prisma.review.findMany({
    select: { id: true, fromUserId: true, roleFrom: true, toUserId: true, roleTo: true, rating: true },
  });
  for (const r of allReviews) {
    console.log(`  ${r.id}: from=${r.fromUserId} (${r.roleFrom}) → to=${r.toUserId} (${r.roleTo}) rating=${r.rating}`);
  }

  console.log('\n🎉 Concluído!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

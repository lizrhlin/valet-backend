/**
 * Job de retenção de notificações.
 * Apaga notificações com mais de 90 dias do banco.
 * Deve ser executado diariamente via cron ou scheduler.
 *
 * Uso: npx tsx scripts/cleanup-notifications.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RETENTION_DAYS = 90;

async function cleanupNotifications() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  console.log(`🧹 Limpando notificações anteriores a ${cutoffDate.toISOString()} (${RETENTION_DAYS} dias)...`);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  console.log(`✅ ${result.count} notificações antigas removidas do banco.`);
}

cleanupNotifications()
  .catch((error) => {
    console.error('❌ Erro ao limpar notificações:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

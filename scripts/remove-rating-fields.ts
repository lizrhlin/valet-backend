import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function runSQL() {
  console.log('🔄 Removendo campos detalhados de rating...\n');

  const sqlPath = path.join(__dirname, 'remove-rating-fields.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('✅ Campos removidos com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

runSQL()
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

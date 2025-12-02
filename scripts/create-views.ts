import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createViews() {
  try {
    // Dropar views antigas primeiro
    await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS all_users;`);
    await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS clients;`);
    await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS professionals;`);

    // 2. View de clientes (todas as colunas)
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE VIEW clients AS
      SELECT *
      FROM users
      WHERE "userType" = 'CLIENT';
    `);

    // 3. View de profissionais (todas as colunas)
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE VIEW professionals AS
      SELECT *
      FROM users
      WHERE "userType" = 'PROFESSIONAL';
    `);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createViews();

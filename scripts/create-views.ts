import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createViews() {
  try {
    console.log('🔧 Criando views...\n');

    // Dropar views antigas primeiro
    await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS all_users;`);
    await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS clients;`);
    await prisma.$executeRawUnsafe(`DROP VIEW IF EXISTS professionals;`);
    console.log('✅ Views antigas removidas\n');

    // 2. View de clientes (todas as colunas)
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE VIEW clients AS
      SELECT *
      FROM users
      WHERE "userType" = 'CLIENT';
    `);
    console.log('✅ View clients criada');

    // 3. View de profissionais (todas as colunas)
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE VIEW professionals AS
      SELECT *
      FROM users
      WHERE "userType" = 'PROFESSIONAL';
    `);
    console.log('✅ View professionals criada');

    console.log('\n🎉 Views criadas com sucesso!');
    console.log('\nAgora você tem:');
    console.log('  📋 users         - TODOS os usuários');
    console.log('  👁️  clients       - Apenas clientes');
    console.log('  👁️  professionals - Apenas profissionais');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createViews();

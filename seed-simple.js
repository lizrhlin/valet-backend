import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  try {
    // Limpar dados existentes
    console.log('🧹 Limpando dados existentes...');
    await prisma.notification.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.review.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.customAvailability.deleteMany();
    await prisma.professionalSubcategory.deleteMany();
    await prisma.professionalCategory.deleteMany();
    await prisma.subcategory.deleteMany();
    await prisma.category.deleteMany();
    await prisma.address.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Dados limpos com sucesso\n');

    // ============================================
    // CATEGORIAS E SUBCATEGORIAS
    // ============================================

    console.log('📦 Criando categorias e subcategorias...');

    // Categoria: Elétrica
    const eletrica = await prisma.category.create({
      data: {
        name: 'Elétrica',
        slug: 'eletrica',
        icon: 'bolt',
        backgroundColor: '#FFF3CD',
        description: 'Serviços de instalação e manutenção elétrica',
        isActive: true,
        order: 1,
      },
    });

    await prisma.subcategory.createMany({
      data: [
        {
          categoryId: eletrica.id,
          name: 'Troca de lâmpadas',
          slug: 'troca-lampadas',
          description: 'Instalação e troca de lâmpadas',
          suggestedMinPrice: 30,
          suggestedMaxPrice: 80,
          estimatedDuration: 30,
          isActive: true,
          order: 1,
        },
        {
          categoryId: eletrica.id,
          name: 'Instalação de tomadas e interruptores',
          slug: 'instalacao-tomadas-interruptores',
          description: 'Instalação e reparo de tomadas e interruptores',
          suggestedMinPrice: 50,
          suggestedMaxPrice: 150,
          estimatedDuration: 60,
          isActive: true,
          order: 2,
        },
        {
          categoryId: eletrica.id,
          name: 'Instalação de ventilador de teto',
          slug: 'instalacao-ventilador-teto',
          description: 'Instalação completa de ventilador de teto',
          suggestedMinPrice: 80,
          suggestedMaxPrice: 200,
          estimatedDuration: 90,
          isActive: true,
          order: 3,
        },
        {
          categoryId: eletrica.id,
          name: 'Reparo de disjuntores',
          slug: 'reparo-disjuntores',
          description: 'Verificação e reparo de disjuntores',
          suggestedMinPrice: 100,
          suggestedMaxPrice: 300,
          estimatedDuration: 120,
          isActive: true,
          order: 4,
        },
      ],
    });
    console.log('  ✅ Categoria Elétrica criada com 4 subcategorias');

    // Categoria: Hidráulica
    const hidraulica = await prisma.category.create({
      data: {
        name: 'Hidráulica',
        slug: 'hidraulica',
        icon: 'water-drop',
        backgroundColor: '#D1ECF1',
        description: 'Serviços de encanamento e instalações hidráulicas',
        isActive: true,
        order: 2,
      },
    });

    await prisma.subcategory.createMany({
      data: [
        {
          categoryId: hidraulica.id,
          name: 'Desentupimento',
          slug: 'desentupimento',
          description: 'Desentupimento de pias, ralos e vasos',
          suggestedMinPrice: 80,
          suggestedMaxPrice: 250,
          estimatedDuration: 60,
          isActive: true,
          order: 1,
        },
        {
          categoryId: hidraulica.id,
          name: 'Reparo de torneiras',
          slug: 'reparo-torneiras',
          description: 'Conserto e troca de torneiras',
          suggestedMinPrice: 50,
          suggestedMaxPrice: 150,
          estimatedDuration: 45,
          isActive: true,
          order: 2,
        },
        {
          categoryId: hidraulica.id,
          name: 'Instalação de chuveiro',
          slug: 'instalacao-chuveiro',
          description: 'Instalação de chuveiro elétrico ou a gás',
          suggestedMinPrice: 100,
          suggestedMaxPrice: 300,
          estimatedDuration: 90,
          isActive: true,
          order: 3,
        },
        {
          categoryId: hidraulica.id,
          name: 'Reparo de vazamentos',
          slug: 'reparo-vazamentos',
          description: 'Identificação e reparo de vazamentos',
          suggestedMinPrice: 120,
          suggestedMaxPrice: 400,
          estimatedDuration: 120,
          isActive: true,
          order: 4,
        },
      ],
    });
    console.log('  ✅ Categoria Hidráulica criada com 4 subcategorias');

    // Categoria: Limpeza
    const limpeza = await prisma.category.create({
      data: {
        name: 'Limpeza',
        slug: 'limpeza',
        icon: 'cleaning',
        backgroundColor: '#D4EDDA',
        description: 'Serviços de limpeza residencial e comercial',
        isActive: true,
        order: 3,
      },
    });

    await prisma.subcategory.createMany({
      data: [
        {
          categoryId: limpeza.id,
          name: 'Limpeza residencial',
          slug: 'limpeza-residencial',
          description: 'Limpeza completa de residências',
          suggestedMinPrice: 80,
          suggestedMaxPrice: 200,
          estimatedDuration: 180,
          isActive: true,
          order: 1,
        },
        {
          categoryId: limpeza.id,
          name: 'Limpeza pós-obra',
          slug: 'limpeza-pos-obra',
          description: 'Limpeza pesada após reformas',
          suggestedMinPrice: 150,
          suggestedMaxPrice: 500,
          estimatedDuration: 240,
          isActive: true,
          order: 2,
        },
        {
          categoryId: limpeza.id,
          name: 'Lavagem de estofados',
          slug: 'lavagem-estofados',
          description: 'Higienização de sofás e colchões',
          suggestedMinPrice: 100,
          suggestedMaxPrice: 300,
          estimatedDuration: 120,
          isActive: true,
          order: 3,
        },
      ],
    });
    console.log('  ✅ Categoria Limpeza criada com 3 subcategorias');

    // Categoria: Reformas
    const reformas = await prisma.category.create({
      data: {
        name: 'Reformas',
        slug: 'reformas',
        icon: 'construction',
        backgroundColor: '#F8D7DA',
        description: 'Serviços de pedreiro e reformas',
        isActive: true,
        order: 4,
      },
    });

    await prisma.subcategory.createMany({
      data: [
        {
          categoryId: reformas.id,
          name: 'Pintura',
          slug: 'pintura',
          description: 'Pintura de paredes e tetos',
          suggestedMinPrice: 200,
          suggestedMaxPrice: 1000,
          estimatedDuration: 480,
          isActive: true,
          order: 1,
        },
        {
          categoryId: reformas.id,
          name: 'Instalação de pisos',
          slug: 'instalacao-pisos',
          description: 'Instalação de pisos e revestimentos',
          suggestedMinPrice: 300,
          suggestedMaxPrice: 1500,
          estimatedDuration: 480,
          isActive: true,
          order: 2,
        },
        {
          categoryId: reformas.id,
          name: 'Reboco e massa corrida',
          slug: 'reboco-massa-corrida',
          description: 'Aplicação de reboco e massa corrida',
          suggestedMinPrice: 250,
          suggestedMaxPrice: 1200,
          estimatedDuration: 480,
          isActive: true,
          order: 3,
        },
      ],
    });
    console.log('  ✅ Categoria Reformas criada com 3 subcategorias');

    // Categoria: Marcenaria
    const marcenaria = await prisma.category.create({
      data: {
        name: 'Marcenaria',
        slug: 'marcenaria',
        icon: 'carpenter',
        backgroundColor: '#FFF3E0',
        description: 'Serviços de marceneiro e montagem de móveis',
        isActive: true,
        order: 5,
      },
    });

    await prisma.subcategory.createMany({
      data: [
        {
          categoryId: marcenaria.id,
          name: 'Montagem de móveis',
          slug: 'montagem-moveis',
          description: 'Montagem de móveis planejados e de loja',
          suggestedMinPrice: 50,
          suggestedMaxPrice: 300,
          estimatedDuration: 120,
          isActive: true,
          order: 1,
        },
        {
          categoryId: marcenaria.id,
          name: 'Instalação de portas',
          slug: 'instalacao-portas',
          description: 'Instalação e ajuste de portas',
          suggestedMinPrice: 100,
          suggestedMaxPrice: 400,
          estimatedDuration: 180,
          isActive: true,
          order: 2,
        },
        {
          categoryId: marcenaria.id,
          name: 'Reparo de móveis',
          slug: 'reparo-moveis',
          description: 'Conserto de móveis danificados',
          suggestedMinPrice: 80,
          suggestedMaxPrice: 300,
          estimatedDuration: 120,
          isActive: true,
          order: 3,
        },
      ],
    });
    console.log('  ✅ Categoria Marcenaria criada com 3 subcategorias\n');

    console.log('✨ Seed concluído com sucesso!');
    console.log('\n📊 Resumo:');
    console.log('  - 5 categorias criadas');
    console.log('  - 17 subcategorias criadas');
  } catch (error) {
    console.error('\n❌ Erro durante o seed:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

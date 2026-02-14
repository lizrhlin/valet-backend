import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpar apenas tabelas de categorias
  await prisma.subcategory.deleteMany();
  await prisma.category.deleteMany();
  console.log('🧹 Dados antigos removidos');


  // ============================================
  // CATEGORIAS E SUBCATEGORIAS
  // ============================================

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
        suggestedMinPriceCents: 3000,
        suggestedMaxPriceCents: 8000,
        estimatedDuration: 30,
        isActive: true,
        order: 1,
      },
      {
        categoryId: eletrica.id,
        name: 'Instalação de tomadas e interruptores',
        slug: 'instalacao-tomadas-interruptores',
        description: 'Instalação e reparo de tomadas e interruptores',
        suggestedMinPriceCents: 5000,
        suggestedMaxPriceCents: 15000,
        estimatedDuration: 60,
        isActive: true,
        order: 2,
      },
      {
        categoryId: eletrica.id,
        name: 'Instalação de ventilador de teto',
        slug: 'instalacao-ventilador-teto',
        description: 'Instalação completa de ventilador de teto',
        suggestedMinPriceCents: 8000,
        suggestedMaxPriceCents: 20000,
        estimatedDuration: 90,
        isActive: true,
        order: 3,
      },
      {
        categoryId: eletrica.id,
        name: 'Reparo de disjuntores',
        slug: 'reparo-disjuntores',
        description: 'Verificação e reparo de disjuntores',
        suggestedMinPriceCents: 10000,
        suggestedMaxPriceCents: 30000,
        estimatedDuration: 120,
        isActive: true,
        order: 4,
      },
    ],
  });

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
        suggestedMinPriceCents: 8000,
        suggestedMaxPriceCents: 25000,
        estimatedDuration: 60,
        isActive: true,
        order: 1,
      },
      {
        categoryId: hidraulica.id,
        name: 'Reparo de torneiras',
        slug: 'reparo-torneiras',
        description: 'Conserto e troca de torneiras',
        suggestedMinPriceCents: 5000,
        suggestedMaxPriceCents: 15000,
        estimatedDuration: 45,
        isActive: true,
        order: 2,
      },
      {
        categoryId: hidraulica.id,
        name: 'Instalação de chuveiro',
        slug: 'instalacao-chuveiro',
        description: 'Instalação de chuveiro elétrico ou a gás',
        suggestedMinPriceCents: 10000,
        suggestedMaxPriceCents: 30000,
        estimatedDuration: 90,
        isActive: true,
        order: 3,
      },
      {
        categoryId: hidraulica.id,
        name: 'Reparo de vazamentos',
        slug: 'reparo-vazamentos',
        description: 'Identificação e reparo de vazamentos',
        suggestedMinPriceCents: 12000,
        suggestedMaxPriceCents: 40000,
        estimatedDuration: 120,
        isActive: true,
        order: 4,
      },
    ],
  });

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
        suggestedMinPriceCents: 8000,
        suggestedMaxPriceCents: 20000,
        estimatedDuration: 180,
        isActive: true,
        order: 1,
      },
      {
        categoryId: limpeza.id,
        name: 'Limpeza pós-obra',
        slug: 'limpeza-pos-obra',
        description: 'Limpeza pesada após reformas',
        suggestedMinPriceCents: 15000,
        suggestedMaxPriceCents: 50000,
        estimatedDuration: 240,
        isActive: true,
        order: 2,
      },
      {
        categoryId: limpeza.id,
        name: 'Lavagem de estofados',
        slug: 'lavagem-estofados',
        description: 'Higienização de sofás e colchões',
        suggestedMinPriceCents: 10000,
        suggestedMaxPriceCents: 30000,
        estimatedDuration: 120,
        isActive: true,
        order: 3,
      },
    ],
  });

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
        suggestedMinPriceCents: 20000,
        suggestedMaxPriceCents: 100000,
        estimatedDuration: 480,
        isActive: true,
        order: 1,
      },
      {
        categoryId: reformas.id,
        name: 'Instalação de pisos',
        slug: 'instalacao-pisos',
        description: 'Instalação de pisos e revestimentos',
        suggestedMinPriceCents: 30000,
        suggestedMaxPriceCents: 150000,
        estimatedDuration: 480,
        isActive: true,
        order: 2,
      },
      {
        categoryId: reformas.id,
        name: 'Reboco e massa corrida',
        slug: 'reboco-massa-corrida',
        description: 'Aplicação de reboco e massa corrida',
        suggestedMinPriceCents: 25000,
        suggestedMaxPriceCents: 120000,
        estimatedDuration: 480,
        isActive: true,
        order: 3,
      },
    ],
  });

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
        suggestedMinPriceCents: 5000,
        suggestedMaxPriceCents: 30000,
        estimatedDuration: 120,
        isActive: true,
        order: 1,
      },
      {
        categoryId: marcenaria.id,
        name: 'Instalação de portas',
        slug: 'instalacao-portas',
        description: 'Instalação e ajuste de portas',
        suggestedMinPriceCents: 10000,
        suggestedMaxPriceCents: 40000,
        estimatedDuration: 180,
        isActive: true,
        order: 2,
      },
      {
        categoryId: marcenaria.id,
        name: 'Reparo de móveis',
        slug: 'reparo-moveis',
        description: 'Conserto de móveis danificados',
        suggestedMinPriceCents: 8000,
        suggestedMaxPriceCents: 30000,
        estimatedDuration: 120,
        isActive: true,
        order: 3,
      },
    ],
  });

  console.log('✨ Seed concluído com sucesso!');
  console.log('📊 Resumo:');
  console.log('  - 5 categorias criadas');
  console.log('  - 17 subcategorias criadas');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

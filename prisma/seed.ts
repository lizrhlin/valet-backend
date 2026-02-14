import { PrismaClient, UserType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {

  // Limpar dados existentes (cuidado em produção!)
  await prisma.notification.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.customAvailability.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.userDocument.deleteMany();
  await prisma.professionalSubcategory.deleteMany();
  await prisma.professionalCategory.deleteMany();
  await prisma.professionalProfile.deleteMany();
  await prisma.subcategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();


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
        suggestedMinPriceCents: 30,
        suggestedMaxPriceCents: 80,
        estimatedDuration: 30,
        isActive: true,
        order: 1,
      },
      {
        categoryId: eletrica.id,
        name: 'Instalação de tomadas e interruptores',
        slug: 'instalacao-tomadas-interruptores',
        description: 'Instalação e reparo de tomadas e interruptores',
        suggestedMinPriceCents: 50,
        suggestedMaxPriceCents: 150,
        estimatedDuration: 60,
        isActive: true,
        order: 2,
      },
      {
        categoryId: eletrica.id,
        name: 'Instalação de ventilador de teto',
        slug: 'instalacao-ventilador-teto',
        description: 'Instalação completa de ventilador de teto',
        suggestedMinPriceCents: 80,
        suggestedMaxPriceCents: 200,
        estimatedDuration: 90,
        isActive: true,
        order: 3,
      },
      {
        categoryId: eletrica.id,
        name: 'Reparo de disjuntores',
        slug: 'reparo-disjuntores',
        description: 'Verificação e reparo de disjuntores',
        suggestedMinPriceCents: 100,
        suggestedMaxPriceCents: 300,
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
        suggestedMinPriceCents: 80,
        suggestedMaxPriceCents: 250,
        estimatedDuration: 60,
        isActive: true,
        order: 1,
      },
      {
        categoryId: hidraulica.id,
        name: 'Reparo de torneiras',
        slug: 'reparo-torneiras',
        description: 'Conserto e troca de torneiras',
        suggestedMinPriceCents: 50,
        suggestedMaxPriceCents: 150,
        estimatedDuration: 45,
        isActive: true,
        order: 2,
      },
      {
        categoryId: hidraulica.id,
        name: 'Instalação de chuveiro',
        slug: 'instalacao-chuveiro',
        description: 'Instalação de chuveiro elétrico ou a gás',
        suggestedMinPriceCents: 100,
        suggestedMaxPriceCents: 300,
        estimatedDuration: 90,
        isActive: true,
        order: 3,
      },
      {
        categoryId: hidraulica.id,
        name: 'Reparo de vazamentos',
        slug: 'reparo-vazamentos',
        description: 'Identificação e reparo de vazamentos',
        suggestedMinPriceCents: 120,
        suggestedMaxPriceCents: 400,
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
        suggestedMinPriceCents: 80,
        suggestedMaxPriceCents: 200,
        estimatedDuration: 180,
        isActive: true,
        order: 1,
      },
      {
        categoryId: limpeza.id,
        name: 'Limpeza pós-obra',
        slug: 'limpeza-pos-obra',
        description: 'Limpeza pesada após reformas',
        suggestedMinPriceCents: 150,
        suggestedMaxPriceCents: 500,
        estimatedDuration: 240,
        isActive: true,
        order: 2,
      },
      {
        categoryId: limpeza.id,
        name: 'Lavagem de estofados',
        slug: 'lavagem-estofados',
        description: 'Higienização de sofás e colchões',
        suggestedMinPriceCents: 100,
        suggestedMaxPriceCents: 300,
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
        suggestedMinPriceCents: 200,
        suggestedMaxPriceCents: 1000,
        estimatedDuration: 480,
        isActive: true,
        order: 1,
      },
      {
        categoryId: reformas.id,
        name: 'Instalação de pisos',
        slug: 'instalacao-pisos',
        description: 'Instalação de pisos e revestimentos',
        suggestedMinPriceCents: 300,
        suggestedMaxPriceCents: 1500,
        estimatedDuration: 480,
        isActive: true,
        order: 2,
      },
      {
        categoryId: reformas.id,
        name: 'Reboco e massa corrida',
        slug: 'reboco-massa-corrida',
        description: 'Aplicação de reboco e massa corrida',
        suggestedMinPriceCents: 250,
        suggestedMaxPriceCents: 1200,
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
        suggestedMinPriceCents: 50,
        suggestedMaxPriceCents: 300,
        estimatedDuration: 120,
        isActive: true,
        order: 1,
      },
      {
        categoryId: marcenaria.id,
        name: 'Instalação de portas',
        slug: 'instalacao-portas',
        description: 'Instalação e ajuste de portas',
        suggestedMinPriceCents: 100,
        suggestedMaxPriceCents: 400,
        estimatedDuration: 180,
        isActive: true,
        order: 2,
      },
      {
        categoryId: marcenaria.id,
        name: 'Reparo de móveis',
        slug: 'reparo-moveis',
        description: 'Conserto de móveis danificados',
        suggestedMinPriceCents: 80,
        suggestedMaxPriceCents: 300,
        estimatedDuration: 120,
        isActive: true,
        order: 3,
      },
    ],
  });


  // ============================================
  // USUÁRIO ADMIN
  // ============================================

  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@liz.com',
      name: 'Administrador',
      password: adminPassword,
      phone: '+5511999999999',
      userType: UserType.ADMIN,
      status: 'ACTIVE',
    },
  });


  // ============================================
  // USUÁRIOS DE TESTE
  // ============================================

  // Cliente de teste
  const clientPassword = await bcrypt.hash('Cliente@123', 10);
  const client = await prisma.user.create({
    data: {
      email: 'cliente@teste.com',
      name: 'João Silva',
      password: clientPassword,
      phone: '+5511988887777',
      userType: UserType.CLIENT,
      status: 'ACTIVE',
    },
  });

  // Endereço do cliente
  await prisma.address.create({
    data: {
      userId: client.id,
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apto 45',
      neighborhood: 'Jardim Paulista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
      latitude: -23.5613,
      longitude: -46.6552,
      isDefault: true,
    },
  });


  // Profissional de teste - Eletricista
  const professionalPassword = await bcrypt.hash('Profissional@123', 10);
  const professional = await prisma.user.create({
    data: {
      email: 'eletricista@teste.com',
      name: 'Carlos Oliveira',
      password: professionalPassword,
      phone: '+5511977776666',
      userType: UserType.PROFESSIONAL,
      status: 'ACTIVE',
      cpf: '123.456.789-00',
      // Campos específicos de profissional
      specialty: 'Eletricista',
      description: 'Eletricista com 10 anos de experiência em instalações residenciais e comerciais.',
      experience: '10 anos',
      location: 'São Paulo, SP',
      latitude: -23.5505,
      longitude: -46.6333,
      available: true,
      isVerified: true,
      rating: 4.8,
    },
  });


  // Vincular profissional à categoria Elétrica
  await prisma.professionalCategory.create({
    data: {
      professionalId: professional.id,
      categoryId: eletrica.id,
    },
  });

  // Adicionar serviços do eletricista
  const subcategoriesEletrica = await prisma.subcategory.findMany({
    where: { categoryId: eletrica.id },
  });

  for (const subcategory of subcategoriesEletrica) {
    await prisma.professionalSubcategory.create({
      data: {
        professionalId: professional.id,
        subcategoryId: subcategory.id,
        priceCents: Math.round((subcategory.suggestedMinPriceCents! || 0) * 1.2), // 20% acima do mínimo
        description: `Serviço profissional de ${subcategory.name.toLowerCase()}`,
        isActive: true,
      },
    });
  }

  // Disponibilidade do profissional
  // Segunda a Sexta, 8h às 18h
  for (let day = 1; day <= 5; day++) {
    await prisma.availability.create({
      data: {
        professionalId: professional.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '12:00',
        isActive: true,
      },
    });
    await prisma.availability.create({
      data: {
        professionalId: professional.id,
        dayOfWeek: day,
        startTime: '13:00',
        endTime: '18:00',
        isActive: true,
      },
    });
  }

  // Sábado, 8h às 13h
  await prisma.availability.create({
    data: {
      professionalId: professional.id,
      dayOfWeek: 6,
      startTime: '08:00',
      endTime: '13:00',
      isActive: true,
    },
  });

  // Profissional de teste - Encanador
  const encanador = await prisma.user.create({
    data: {
      email: 'encanador@teste.com',
      name: 'Pedro Santos',
      password: professionalPassword,
      phone: '+5511966665555',
      userType: UserType.PROFESSIONAL,
      status: 'ACTIVE',
      cpf: '987.654.321-00',
      // Campos específicos de profissional
      specialty: 'Encanador',
      description: 'Encanador especializado em desentupimentos e instalações hidráulicas.',
      experience: '8 anos',
      location: 'São Paulo, SP',
      latitude: -23.5489,
      longitude: -46.6388,
      available: true,
      isVerified: true,
      rating: 4.9,
    },
  });


  await prisma.professionalCategory.create({
    data: {
      professionalId: encanador.id,
      categoryId: hidraulica.id,
    },
  });

  const subcategoriesHidraulica = await prisma.subcategory.findMany({
    where: { categoryId: hidraulica.id },
  });

  for (const subcategory of subcategoriesHidraulica) {
    await prisma.professionalSubcategory.create({
      data: {
        professionalId: encanador.id,
        subcategoryId: subcategory.id,
        priceCents: Math.round((subcategory.suggestedMinPriceCents! || 0) * 1.3),
        description: `Serviço especializado de ${subcategory.name.toLowerCase()}`,
        isActive: true,
      },
    });
  }

}

main()
  .catch((e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, UserType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes (cuidado em produção!)
  await prisma.message.deleteMany();
  await prisma.chatParticipant.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.professionalSubcategory.deleteMany();
  await prisma.professionalCategory.deleteMany();
  await prisma.subcategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Dados anteriores limpos');

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

  console.log('✅ Categorias e subcategorias criadas');

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

  console.log('✅ Usuário admin criado:', admin.email);

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

  console.log('✅ Cliente de teste criado:', client.email);

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

  console.log('✅ Profissional de teste criado:', professional.email);

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
        price: subcategory.suggestedMinPrice! * 1.2, // 20% acima do mínimo
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

  // console.log('✅ Profissional eletricista criado já foi exibido acima');

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

  console.log('✅ Profissional encanador criado:', encanador.email);

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
        price: subcategory.suggestedMinPrice! * 1.3,
        description: `Serviço especializado de ${subcategory.name.toLowerCase()}`,
        isActive: true,
      },
    });
  }

  // console.log('✅ Profissional encanador criado já foi exibido acima');

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\n📊 Resumo:');
  console.log(`   - ${await prisma.category.count()} categorias`);
  console.log(`   - ${await prisma.subcategory.count()} subcategorias`);
  console.log(`   - ${await prisma.user.count()} usuários`);
  console.log('\n🔑 Credenciais de teste:');
  console.log('   Admin: admin@liz.com / Admin@123');
  console.log('   Cliente: cliente@teste.com / Cliente@123');
  console.log('   Eletricista: eletricista@teste.com / Profissional@123');
  console.log('   Encanador: encanador@teste.com / Profissional@123');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

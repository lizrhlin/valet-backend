import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { RegisterInput, LoginInput } from '../schemas/user.schema.js';

const SALT_ROUNDS = 10;

export async function register(prisma: PrismaClient, input: RegisterInput) {
    specialty: input.specialty,
    experience: input.experience,
    description: input.description,
    userType: input.userType,
    services: input.services,
  }, null, 2));
  
  // Verificar se o email já existe
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new Error('E-mail já cadastrado');
  }

  // Verificar se o CPF já existe para o mesmo tipo de usuário
  if (input.cpf) {
    const existingCpf = await prisma.user.findFirst({
      where: { 
        cpf: input.cpf,
        userType: input.userType,
      },
    });

    if (existingCpf) {
      throw new Error(`CPF já cadastrado como ${input.userType === 'PROFESSIONAL' ? 'profissional' : 'cliente'}`);
    }
  }

  // Hash da senha
  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Criar usuário (todos os campos agora estão na mesma tabela)
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      password: hashedPassword,
      phone: input.phone,
      cpf: input.cpf,
      userType: input.userType,
      // Campos específicos de profissionais
      ...(input.userType === 'PROFESSIONAL' && {
        specialty: input.specialty || 'Profissional',
        description: input.description || 'Novo profissional cadastrado',
        experience: input.experience || 'A definir',
        available: true,
        isVerified: false,
      }),
      // Criar endereço se fornecido
      ...(input.address && input.address.city && {
        addresses: {
          create: {
            street: input.address.street || '',
            number: input.address.number || '',
            complement: input.address.complement,
            neighborhood: input.address.neighborhood || '',
            city: input.address.city,
            state: input.address.state || '',
            zipCode: input.address.zipCode || '',
            isDefault: true,
          },
        },
        // Definir location baseado no endereço
        location: `${input.address.city}, ${input.address.state}`,
      }),
    },
  });

  // Se for profissional e tiver serviços, criar relacionamentos
  if (input.userType === 'PROFESSIONAL' && input.services && input.services.length > 0) {
    // Buscar as subcategorias para pegar os categoryIds
    const subcategoryIds = input.services.map(s => s.subcategoryId);
    const subcategories = await prisma.subcategory.findMany({
      where: { id: { in: subcategoryIds } },
      select: { id: true, categoryId: true }
    });

    // Criar mapa de subcategoryId -> categoryId
    const subcategoryToCategoryMap = new Map(
      subcategories.map(sub => [sub.id, sub.categoryId])
    );

    // Coletar categoryIds únicos
    const categoryIds = [...new Set(subcategories.map(sub => sub.categoryId))];

    // Criar ProfessionalCategory para cada categoria única
    await prisma.professionalCategory.createMany({
      data: categoryIds.map(categoryId => ({
        professionalId: user.id,
        categoryId: categoryId,
      })),
      skipDuplicates: true,
    });

    // Criar ProfessionalSubcategory para cada serviço
    await prisma.professionalSubcategory.createMany({
      data: input.services.map(service => ({
        professionalId: user.id,
        subcategoryId: service.subcategoryId,
        price: parseFloat(service.price.replace(',', '.')) || 0,
        isActive: true,
      })),
      skipDuplicates: true,
    });

  }

  // Remover senha do retorno
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
  };
}

export async function login(prisma: PrismaClient, input: LoginInput) {
  // Buscar usuário
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new Error('Credenciais inválidas');
  }

  // Verificar senha
  const isValid = await bcrypt.compare(input.password, user.password);

  if (!isValid) {
    throw new Error('Credenciais inválidas');
  }

  // Remover senha do retorno
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
  };
}

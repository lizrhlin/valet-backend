import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { RegisterInput, LoginInput } from '../schemas/user.schema.js';

const SALT_ROUNDS = 10;

export async function register(prisma: PrismaClient, input: RegisterInput) {
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

  // Validações para profissionais
  if (input.userType === 'PROFESSIONAL') {
    if (!input.avatar) {
      throw new Error('Avatar é obrigatório para profissionais');
    }
    if (!input.documents || input.documents.length < 2) {
      throw new Error('Dois documentos são obrigatórios para profissionais');
    }
  }

  // Hash da senha
  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Usar transação para garantir consistência
  const user = await prisma.$transaction(async (tx) => {
    // Criar usuário
    const newUser = await tx.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: hashedPassword,
        phone: input.phone,
        avatar: input.avatar,
        cpf: input.cpf,
        userType: input.userType,
        // Ativar profissionais que completam o signup com todos os dados
        status: input.userType === 'PROFESSIONAL' ? 'ACTIVE' : 'PENDING_VERIFICATION',
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
        }),
      },
    });

    // Criar perfil profissional (1:1)
    if (input.userType === 'PROFESSIONAL') {
      let primaryCategoryId = input.primaryCategoryId;

      if (!primaryCategoryId && input.specialty) {
        const category = await tx.category.findFirst({
          where: { name: { equals: input.specialty, mode: 'insensitive' } },
          select: { id: true },
        });
        primaryCategoryId = category?.id;
      }

      const experienceRange = input.experienceRange || input.experience || null;

      await tx.professionalProfile.create({
        data: {
          userId: newUser.id,
          primaryCategoryId,
          experienceRange,
          description: input.description || null,
          isAvailable: false,
          isVerified: false,
        },
      });

      // Criar documentos
      if (input.documents && input.documents.length > 0) {
        await tx.userDocument.createMany({
          data: input.documents.map(doc => ({
            userId: newUser.id,
            type: doc.type as 'SELFIE_WITH_DOCUMENT' | 'ID_DOCUMENT',
            url: doc.url,
            status: 'PENDING',
          })),
        });
      }
    }

    // Se for profissional e tiver serviços, criar relacionamentos
    if (input.userType === 'PROFESSIONAL' && input.services && input.services.length > 0) {
      // Buscar as subcategorias para pegar os categoryIds
      const subcategoryIds = input.services.map(s => s.subcategoryId);
      const subcategories = await tx.subcategory.findMany({
        where: { id: { in: subcategoryIds } },
        select: { id: true, categoryId: true }
      });

      // Coletar categoryIds únicos
      const categoryIds = [...new Set(subcategories.map(sub => sub.categoryId))];

      // Criar ProfessionalCategory para cada categoria única
      await tx.professionalCategory.createMany({
        data: categoryIds.map(categoryId => ({
          professionalId: newUser.id,
          categoryId: categoryId,
        })),
        skipDuplicates: true,
      });

      // Criar ProfessionalSubcategory para cada serviço
      await tx.professionalSubcategory.createMany({
        data: input.services.map(service => ({
          professionalId: newUser.id,
          subcategoryId: service.subcategoryId,
          price: parseFloat(service.price.replace(',', '.')) || 0,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }

    return newUser;
  });

  // Remover senha do retorno
  const { passwordHash: _, ...userWithoutPassword } = user;

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
  const isValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isValid) {
    throw new Error('Credenciais inválidas');
  }

  // Remover senha do retorno
  const { passwordHash: _pwd, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
  };
}

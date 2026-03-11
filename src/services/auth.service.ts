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
    // Validar avatar
    if (!input.avatar) {
      throw new Error('Foto de perfil é obrigatória para profissionais');
    }

    // Validar geolocalização (obrigatória para profissionais)
    if (input.latitude == null || input.longitude == null) {
      throw new Error('Localização (latitude/longitude) é obrigatória para profissionais');
    }
    
    // Validar documentos
    if (!input.documents || input.documents.length < 2) {
      throw new Error('Envio de documentos é obrigatório para profissionais (selfie com documento e foto do documento)');
    }
    
    // Verificar se tem os 2 tipos obrigatórios
    const types = input.documents.map(doc => doc.type);
    const hasSelfie = types.includes('SELFIE_WITH_DOCUMENT');
    const hasIdDoc = types.includes('ID_DOCUMENT');
    
    if (!hasSelfie || !hasIdDoc) {
      throw new Error('Envio de documentos é obrigatório para profissionais (selfie com documento e foto do documento)');
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
        // Conta sempre ACTIVE ao concluir cadastro (cliente e profissional)
        // Visibilidade pública do profissional é controlada por isVerified/onboardingStatus
        status: 'ACTIVE',
        // Registrar aceite de termos
        termsAcceptedAt: new Date(),
        termsVersion: '2026-02',
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
              latitude: input.latitude ?? null,
              longitude: input.longitude ?? null,
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
          latitude: input.latitude!,
          longitude: input.longitude!,
          serviceRadiusKm: input.serviceRadiusKm ?? 10,
          isAvailable: false,
          isVerified: false,
          onboardingStatus: 'SUBMITTED', // Profissional completou cadastro
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
          // Converter preço "150,00" para centavos: 15000
          priceCents: Math.round(parseFloat(service.price.replace(',', '.')) * 100) || 0,
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
  // Buscar usuário com perfil profissional e documentos (para reconciliação)
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      professionalProfile: true,
      documents: {
        select: { type: true, status: true },
      },
    },
  });

  if (!user) {
    throw new Error('Credenciais inválidas');
  }

  // Verificar senha
  const isValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isValid) {
    throw new Error('Credenciais inválidas');
  }

  // Reconciliação automática do status de verificação com base nos documentos
  let reconciledProfile = user.professionalProfile;
  if (
    user.userType === 'PROFESSIONAL' &&
    reconciledProfile
  ) {
    const hasIdDoc = user.documents.some(d => d.type === 'ID_DOCUMENT' && d.status === 'APPROVED');
    const hasSelfie = user.documents.some(d => d.type === 'SELFIE_WITH_DOCUMENT' && d.status === 'APPROVED');
    const hasRejectedDoc = user.documents.some(d =>
      (d.type === 'ID_DOCUMENT' || d.type === 'SELFIE_WITH_DOCUMENT') && d.status === 'REJECTED'
    );

    if (hasIdDoc && hasSelfie && !reconciledProfile.isVerified) {
      // Todos aprovados → auto-aprovar perfil
      reconciledProfile = await prisma.professionalProfile.update({
        where: { userId: user.id },
        data: {
          isVerified: true,
          onboardingStatus: 'VERIFIED',
        },
      });
    } else if (hasRejectedDoc && reconciledProfile.onboardingStatus !== 'REJECTED') {
      // Algum documento rejeitado → marcar perfil como rejeitado
      reconciledProfile = await prisma.professionalProfile.update({
        where: { userId: user.id },
        data: {
          isVerified: false,
          onboardingStatus: 'REJECTED',
        },
      });
    }
  }

  // Remover senha do retorno
  const { passwordHash: _pwd, professionalProfile: _pp, documents: _docs, ...userWithoutPassword } = user;

  return {
    user: {
      ...userWithoutPassword,
      // Campos de verificação do profissional (achatados para facilitar no frontend)
      isVerified: reconciledProfile?.isVerified ?? false,
      onboardingStatus: reconciledProfile?.onboardingStatus ?? null,
    },
  };
}

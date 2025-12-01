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
    throw new Error('Email already registered');
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
      userType: input.userType,
      // Campos específicos de profissionais (serão atualizados depois)
      ...(input.userType === 'PROFESSIONAL' && {
        specialty: 'Profissional',
        description: 'Novo profissional cadastrado',
        experience: 'A definir',
        location: 'São Paulo, SP',
        available: true,
        isVerified: false,
      }),
    },
  });

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
    throw new Error('Invalid credentials');
  }

  // Verificar senha
  const isValid = await bcrypt.compare(input.password, user.password);

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Remover senha do retorno
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
  };
}

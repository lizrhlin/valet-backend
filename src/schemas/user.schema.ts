import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema, cpfSchema, idSchema } from './common.schema.js';

// ============================================
// ENUMS
// ============================================

export const userTypeSchema = z.enum(['CLIENT', 'PROFESSIONAL', 'ADMIN']);
export const userStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']);

export type UserType = z.infer<typeof userTypeSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;

// ============================================
// REGISTRO E AUTENTICAÇÃO
// ============================================

export const registerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
  userType: userTypeSchema.default('CLIENT'),
  cpf: cpfSchema.optional(),
  // Avatar (obrigatório para profissionais)
  avatar: z.string().url('URL do avatar inválida').optional(),
  // Campos para profissionais
  primaryCategoryId: z.number().int().positive().optional(),
  experienceRange: z.string().optional(),
  description: z.string().optional(),
  // Compatibilidade legada
  specialty: z.string().optional(),
  experience: z.string().optional(),
  // Documentos para profissionais (URLs dos uploads)
  documents: z.array(z.object({
    type: z.enum(['SELFIE_WITH_DOCUMENT', 'ID_DOCUMENT']),
    url: z.string().url('URL do documento inválida'),
  })).optional(),
  // Serviços do profissional (subcategorias com preços)
  services: z.array(z.object({
    subcategoryId: z.number().int().positive(),
    price: z.string(), // Formato: "150,00"
  })).optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
}).refine((data) => {
  // Se for profissional, avatar é obrigatório
  if (data.userType === 'PROFESSIONAL' && !data.avatar) {
    return false;
  }
  return true;
}, {
  message: 'Foto de perfil é obrigatória para profissionais',
  path: ['avatar'],
}).refine((data) => {
  // Se for profissional, deve ter exatamente 2 documentos
  if (data.userType === 'PROFESSIONAL') {
    if (!data.documents || data.documents.length < 2) {
      return false;
    }
    // Verificar se tem os 2 tipos obrigatórios
    const types = data.documents.map(doc => doc.type);
    const hasSelfie = types.includes('SELFIE_WITH_DOCUMENT');
    const hasIdDoc = types.includes('ID_DOCUMENT');
    
    if (!hasSelfie || !hasIdDoc) {
      return false;
    }
  }
  return true;
}, {
  message: 'Envio de documentos é obrigatório para profissionais (selfie com documento e foto do documento)',
  path: ['documents'],
});

// ============================================
// REGISTRO DE PROFISSIONAL (COM SERVIÇOS)
// ============================================

export const professionalServiceSchema = z.object({
  subcategoryId: z.number().int().positive('ID da subcategoria inválido'),
  price: z.string().min(1, 'Preço é obrigatório'), // Formato: "150,00"
});

export const completeProfessionalRegistrationSchema = z.object({
  primaryCategoryId: z.number().int().positive().optional(),
  experienceRange: z.string().min(1, 'Experiência é obrigatória'),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  // Compatibilidade legada
  specialty: z.string().optional(),
  experience: z.string().optional(),
  services: z.array(professionalServiceSchema).min(1, 'Selecione pelo menos um serviço'),
}).refine((data) => data.primaryCategoryId || data.specialty, {
  message: 'Selecione uma especialidade principal',
  path: ['primaryCategoryId'],
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});

// ============================================
// PERFIL DO USUÁRIO
// ============================================

export const updateProfileSchema = z.object({
  name: z.string().min(3).optional(),
  phone: phoneSchema,
  avatar: z.string().url().optional(),
});

export const updatePreferencesSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  language: z.string().optional(),
});

// ============================================
// SENHA
// ============================================

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: passwordSchema,
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  newPassword: passwordSchema,
});

// ============================================
// DOCUMENTOS E VERIFICAÇÃO
// ============================================

export const uploadVerificationDocsSchema = z.object({
  cpf: cpfSchema,
  verificationDocs: z.array(z.string().url()).min(1, 'Ao menos um documento é necessário'),
});

// ============================================
// RESPONSES
// ============================================

export const userResponseSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  userType: userTypeSchema,
  status: userStatusSchema,
  notificationsEnabled: z.boolean(),
  language: z.string(),
  professionalProfile: z.object({
    id: idSchema,
    primaryCategoryId: z.number().nullable().optional(),
    experienceRange: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    isVerified: z.boolean(),
    isAvailable: z.boolean(),
    servicesCompleted: z.number(),
    ratingAvg: z.number(),
    reviewCount: z.number(),
  }).optional().nullable(),
  createdAt: z.union([z.string().datetime(), z.date()]).transform(val => 
    val instanceof Date ? val.toISOString() : val
  ),
  updatedAt: z.union([z.string().datetime(), z.date()]).transform(val => 
    val instanceof Date ? val.toISOString() : val
  ),
});

export const authResponseSchema = z.object({
  user: userResponseSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

// ============================================
// TYPES
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type ProfessionalService = z.infer<typeof professionalServiceSchema>;
export type CompleteProfessionalRegistrationInput = z.infer<typeof completeProfessionalRegistrationSchema>;

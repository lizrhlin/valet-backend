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
  phone: phoneSchema,
  userType: userTypeSchema.default('CLIENT'),
  cpf: cpfSchema,
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
  darkMode: z.boolean().optional(),
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
  rg: z.string().optional(),
  verificationDocs: z.array(z.string().url()).min(1, 'Ao menos um documento é necessário'),
});

// ============================================
// RESPONSES
// ============================================

export const userResponseSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  userType: userTypeSchema,
  status: userStatusSchema,
  notificationsEnabled: z.boolean(),
  darkMode: z.boolean(),
  language: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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

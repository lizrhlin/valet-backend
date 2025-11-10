import { z } from 'zod';

// ============================================
// SCHEMAS COMUNS REUTILIZÁVEIS
// ============================================

// Paginação
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// Resposta paginada
export const paginatedResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
  });

// Resposta padrão da API
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
  });

// Resposta de erro
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional(),
});

// ID válido (CUID)
export const idSchema = z.string().cuid();

// Email
export const emailSchema = z.string().email('Email inválido');

// Telefone brasileiro
export const phoneSchema = z
  .string()
  .regex(/^\+?55?\s?\(?[1-9]{2}\)?\s?9?\d{4}-?\d{4}$/, 'Telefone inválido')
  .optional();

// CPF brasileiro
export const cpfSchema = z
  .string()
  .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido')
  .optional();

// CEP brasileiro
export const cepSchema = z
  .string()
  .regex(/^\d{5}-?\d{3}$/, 'CEP inválido');

// Senha forte
export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número');

// Data futura
export const futureDateSchema = z
  .string()
  .datetime()
  .refine((date) => new Date(date) > new Date(), {
    message: 'Data deve ser no futuro',
  });

// Horário (HH:MM)
export const timeSchema = z
  .string()
  .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido (use HH:MM)');

// Rating (1-5)
export const ratingSchema = z
  .number()
  .int()
  .min(1, 'Rating deve ser no mínimo 1')
  .max(5, 'Rating deve ser no máximo 5');

// Preço
export const priceSchema = z
  .number()
  .positive('Preço deve ser positivo')
  .multipleOf(0.01, 'Preço deve ter no máximo 2 casas decimais');

// Coordenadas geográficas
export const latitudeSchema = z.number().min(-90).max(90);
export const longitudeSchema = z.number().min(-180).max(180);

// Ordenação
export const sortOrderSchema = z.enum(['asc', 'desc']).default('asc');

// Status booleano
export const booleanSchema = z
  .enum(['true', 'false'])
  .transform((val) => val === 'true')
  .or(z.boolean());

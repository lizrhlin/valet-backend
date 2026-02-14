import { z } from 'zod';
import { idSchema, priceSchema, latitudeSchema, longitudeSchema } from './common.schema.js';

// ============================================
// CRIAR/ATUALIZAR PERFIL PROFISSIONAL
// ============================================

export const createProfessionalProfileSchema = z.object({
  specialty: z.string().min(3, 'Especialização deve ter no mínimo 3 caracteres'),
  description: z.string().min(20, 'Descrição deve ter no mínimo 20 caracteres'),
  experience: z.string().min(1, 'Experiência é obrigatória'),
  location: z.string().min(3, 'Localização é obrigatória'),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  available: z.boolean().optional().default(true),
});

export const updateProfessionalProfileSchema = createProfessionalProfileSchema.partial();

// ============================================
// ADICIONAR SERVIÇO AO PROFISSIONAL
// ============================================

export const addServiceToProfessionalSchema = z.object({
  subcategoryId: z.number().int().positive('ID da subcategoria inválido'),
  price: priceSchema,
  description: z.string().optional(),
});

export const updateProfessionalServiceSchema = z.object({
  price: priceSchema.optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// DISPONIBILIDADE
// ============================================

const availabilityBaseSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6, 'Dia da semana deve estar entre 0 (domingo) e 6 (sábado)'),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido (use HH:MM)'),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido (use HH:MM)'),
});

export const addAvailabilitySchema = availabilityBaseSchema.refine(
  (data) => data.startTime < data.endTime,
  {
    message: 'Horário de início deve ser anterior ao horário de término',
    path: ['endTime'],
  }
);

export const updateAvailabilitySchema = availabilityBaseSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ============================================
// BUSCAR PROFISSIONAIS
// ============================================

export const searchProfessionalsSchema = z.object({
  subcategoryId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  maxDistance: z.coerce.number().positive().optional(), // em km
  minRating: z.coerce.number().min(0).max(5).optional(),
  available: z.boolean().optional(),
  sortBy: z.enum(['rating', 'price', 'distance', 'servicesCompleted']).optional().default('rating'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

// ============================================
// PARAMS
// ============================================

export const professionalIdParamSchema = z.object({
  professionalId: idSchema,
});

export const availabilityIdParamSchema = z.object({
  availabilityId: idSchema,
});

// ============================================
// RESPONSES
// ============================================

export const professionalSubcategoryResponseSchema = z.object({
  subcategoryId: z.number(),
  price: z.number(),
  description: z.string().optional(),
  isActive: z.boolean(),
  subcategory: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    categoryId: z.number(),
  }),
});

export const professionalResponseSchema = z.object({
  id: idSchema,
  userId: idSchema,
  specialty: z.string(),
  description: z.string(),
  experience: z.string(),
  servicesCompleted: z.number(),
  available: z.boolean(),
  isVerified: z.boolean(),
  location: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  rating: z.number(),
  reviewCount: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  user: z.object({
    id: idSchema,
    name: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
  }),
  subcategories: z.array(professionalSubcategoryResponseSchema).optional(),
});

export const availabilityResponseSchema = z.object({
  id: idSchema,
  professionalId: idSchema,
  dayOfWeek: z.number(),
  startTime: z.string(),
  endTime: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================
// TYPES
// ============================================

export type CreateProfessionalProfileInput = z.infer<typeof createProfessionalProfileSchema>;
export type UpdateProfessionalProfileInput = z.infer<typeof updateProfessionalProfileSchema>;
export type AddServiceToProfessionalInput = z.infer<typeof addServiceToProfessionalSchema>;
export type UpdateProfessionalServiceInput = z.infer<typeof updateProfessionalServiceSchema>;
export type AddAvailabilityInput = z.infer<typeof addAvailabilitySchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type SearchProfessionalsInput = z.infer<typeof searchProfessionalsSchema>;
export type ProfessionalResponse = z.infer<typeof professionalResponseSchema>;
export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>;

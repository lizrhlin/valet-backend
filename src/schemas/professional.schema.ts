import { z } from 'zod';
import { idSchema, priceSchema, latitudeSchema, longitudeSchema } from './common.schema.js';

// ============================================
// CRIAR/ATUALIZAR PERFIL PROFISSIONAL
// ============================================

export const createProfessionalProfileSchema = z.object({
  primaryCategoryId: z.number().int().positive().optional(),
  experienceRange: z.string().min(1, 'Experiência é obrigatória'),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  isAvailable: z.boolean().optional().default(false),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  serviceRadiusKm: z.number().positive().optional().default(10),
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
// BUSCAR PROFISSIONAIS
// ============================================

// Schema de busca legado (GET /professionals - sem geo)
export const searchProfessionalsSchema = z.object({
  subcategoryId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  available: z.boolean().optional(),
  sortBy: z.enum(['rating', 'price', 'distance', 'servicesCompleted']).optional().default('rating'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

// Schema principal de busca geo (POST /professionals/search)
export const searchProfessionalsGeoSchema = z.object({
  lat: latitudeSchema,
  lng: longitudeSchema,
  subcategoryId: z.number().int().positive(),
  categoryId: z.number().int().positive().optional(),
  minRating: z.number().min(0).max(5).optional(),
  available: z.boolean().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(50).optional().default(10),
});

// ============================================
// PARAMS
// ============================================

export const professionalIdParamSchema = z.object({
  professionalId: idSchema,
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
  professionalProfile: z.object({
    id: idSchema,
    primaryCategoryId: z.number().nullable().optional(),
    experienceRange: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    isAvailable: z.boolean(),
    isVerified: z.boolean(),
    servicesCompleted: z.number(),
    ratingAvg: z.number(),
    reviewCount: z.number(),
  }),
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

// ============================================
// TYPES
// ============================================

export type CreateProfessionalProfileInput = z.infer<typeof createProfessionalProfileSchema>;
export type UpdateProfessionalProfileInput = z.infer<typeof updateProfessionalProfileSchema>;
export type AddServiceToProfessionalInput = z.infer<typeof addServiceToProfessionalSchema>;
export type UpdateProfessionalServiceInput = z.infer<typeof updateProfessionalServiceSchema>;
export type SearchProfessionalsInput = z.infer<typeof searchProfessionalsSchema>;
export type SearchProfessionalsGeoInput = z.infer<typeof searchProfessionalsGeoSchema>;
export type ProfessionalResponse = z.infer<typeof professionalResponseSchema>;

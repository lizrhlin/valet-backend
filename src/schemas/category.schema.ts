import { z } from 'zod';
import { priceSchema } from './common.schema.js';

// ============================================
// CRIAR/ATUALIZAR CATEGORIA
// ============================================

export const createCategorySchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  slug: z.string().min(3, 'Slug deve ter no mínimo 3 caracteres').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  icon: z.string().min(1, 'Ícone é obrigatório'),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor inválida (use formato hexadecimal #RRGGBB)'),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  order: z.number().int().optional().default(0),
});

export const updateCategorySchema = createCategorySchema.partial();

// ============================================
// CRIAR/ATUALIZAR SUBCATEGORIA
// ============================================

export const createSubcategorySchema = z.object({
  categoryId: z.number().int().positive('ID da categoria inválido'),
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  slug: z.string().min(3, 'Slug deve ter no mínimo 3 caracteres').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  description: z.string().optional(),
  suggestedMinPrice: priceSchema.optional(),
  suggestedMaxPrice: priceSchema.optional(),
  estimatedDuration: z.number().int().positive('Duração deve ser positiva').optional(),
  imageUrl: z.string().url('URL da imagem inválida').optional(),
  isActive: z.boolean().optional().default(true),
  order: z.number().int().optional().default(0),
});

export const updateSubcategorySchema = createSubcategorySchema.partial();

// ============================================
// BUSCAR CATEGORIAS E SUBCATEGORIAS
// ============================================

export const getCategoriesQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
});

export const getSubcategoriesQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  isActive: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
});

// ============================================
// PARAMS
// ============================================

export const categoryIdParamSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
});

export const subcategoryIdParamSchema = z.object({
  subcategoryId: z.coerce.number().int().positive(),
});

// ============================================
// RESPONSES
// ============================================

export const categoryResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  icon: z.string(),
  backgroundColor: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  order: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const subcategoryResponseSchema = z.object({
  id: z.number(),
  categoryId: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  suggestedMinPrice: z.number().nullable(),
  suggestedMaxPrice: z.number().nullable(),
  estimatedDuration: z.number().nullable(),
  imageUrl: z.string().nullable(),
  isActive: z.boolean(),
  order: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const categoryWithSubcategoriesResponseSchema = categoryResponseSchema.extend({
  subcategories: z.array(subcategoryResponseSchema),
});

// ============================================
// TYPES
// ============================================

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateSubcategoryInput = z.infer<typeof createSubcategorySchema>;
export type UpdateSubcategoryInput = z.infer<typeof updateSubcategorySchema>;
export type CategoryResponse = z.infer<typeof categoryResponseSchema>;
export type SubcategoryResponse = z.infer<typeof subcategoryResponseSchema>;
export type CategoryWithSubcategoriesResponse = z.infer<typeof categoryWithSubcategoriesResponseSchema>;

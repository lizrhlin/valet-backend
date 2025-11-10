import { z } from 'zod';
import { idSchema, cepSchema, latitudeSchema, longitudeSchema } from './common.schema.js';

// ============================================
// CRIAR ENDEREÇO
// ============================================

export const createAddressSchema = z.object({
  street: z.string().min(3, 'Rua deve ter no mínimo 3 caracteres'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(3, 'Bairro deve ter no mínimo 3 caracteres'),
  city: z.string().min(3, 'Cidade deve ter no mínimo 3 caracteres'),
  state: z.string().length(2, 'Estado deve ter 2 caracteres (ex: SP)'),
  zipCode: cepSchema,
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  isDefault: z.boolean().optional().default(false),
});

// ============================================
// ATUALIZAR ENDEREÇO
// ============================================

export const updateAddressSchema = createAddressSchema.partial();

// ============================================
// DEFINIR ENDEREÇO PADRÃO
// ============================================

export const setDefaultAddressSchema = z.object({
  addressId: idSchema,
});

// ============================================
// PARAMS
// ============================================

export const addressIdParamSchema = z.object({
  addressId: idSchema,
});

// ============================================
// RESPONSE
// ============================================

export const addressResponseSchema = z.object({
  id: idSchema,
  userId: idSchema,
  street: z.string(),
  number: z.string(),
  complement: z.string().optional(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================
// TYPES
// ============================================

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type AddressResponse = z.infer<typeof addressResponseSchema>;

import { z } from 'zod';
import { idSchema } from './common.schema.js';

// ============================================
// FAVORITOS
// ============================================

export const addFavoriteSchema = z.object({
  professionalId: idSchema,
});

export const removeFavoriteSchema = z.object({
  professionalId: idSchema,
});

// ============================================
// PARAMS
// ============================================

export const favoriteIdParamSchema = z.object({
  favoriteId: idSchema,
});

export const favoriteProfessionalIdParamSchema = z.object({
  professionalId: idSchema,
});

// ============================================
// QUERY
// ============================================

export const getFavoritesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

// ============================================
// RESPONSES
// ============================================

export const favoriteResponseSchema = z.object({
  id: idSchema,
  userId: idSchema,
  professionalId: idSchema,
  createdAt: z.string().datetime(),
  professional: z.object({
    id: idSchema,
    userId: idSchema,
    specialty: z.string(),
    description: z.string(),
    experience: z.string(),
    available: z.boolean(),
    isVerified: z.boolean(),
    location: z.string(),
    rating: z.number(),
    reviewCount: z.number(),
    user: z.object({
      id: idSchema,
      name: z.string(),
      avatar: z.string().optional(),
      phone: z.string().optional(),
    }),
    subcategories: z.array(z.object({
      subcategoryId: z.number(),
      price: z.number(),
      description: z.string().optional(),
      subcategory: z.object({
        id: z.number(),
        name: z.string(),
        slug: z.string(),
      }),
    })).optional(),
  }).optional(),
});

// ============================================
// TYPES
// ============================================

export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>;
export type RemoveFavoriteInput = z.infer<typeof removeFavoriteSchema>;
export type GetFavoritesQuery = z.infer<typeof getFavoritesQuerySchema>;
export type FavoriteResponse = z.infer<typeof favoriteResponseSchema>;

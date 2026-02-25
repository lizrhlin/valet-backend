import { z } from 'zod';
import { idSchema, ratingSchema } from './common.schema.js';

// ============================================
// ENUMS
// ============================================

export const reviewRoleSchema = z.enum(['CLIENT', 'PROFESSIONAL']);

// ============================================
// CRIAR AVALIAÇÃO (UNIFICADO)
// ============================================

export const createReviewSchema = z.object({
  appointmentId: idSchema,
  toUserId: idSchema.optional(), // Backend ignora e calcula a partir do appointment
  rating: ratingSchema,
  comment: z.string()
    .transform(val => val.trim())
    .pipe(
      z.string()
        .min(10, 'Comentário deve ter no mínimo 10 caracteres ou ser omitido')
        .max(1000, 'Comentário não pode exceder 1000 caracteres')
    )
    .optional()
    .or(z.literal(''))
    .transform(val => (val === '' || !val ? undefined : val)), // Vazio → undefined
});

// ============================================
// BUSCAR AVALIAÇÕES (UNIFICADO)
// ============================================

export const getReviewsQuerySchema = z.object({
  userId: idSchema.optional(),      // Buscar reviews RECEBIDAS por este usuário
  fromUserId: idSchema.optional(),  // Buscar reviews FEITAS por este usuário
  roleTo: reviewRoleSchema.optional(), // Filtrar por papel de quem recebeu
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

// ============================================
// PARAMS
// ============================================

export const reviewIdParamSchema = z.object({
  reviewId: idSchema,
});

// Usado por /reviews/professional/:professionalId
export const professionalReviewsParamSchema = z.object({
  professionalId: idSchema,
});

// Usado por /reviews/user/:userId/stats
export const userStatsParamSchema = z.object({
  userId: idSchema,
});

// ============================================
// RESPONSES (UNIFICADO)
// ============================================

export const reviewResponseSchema = z.object({
  id: idSchema,
  appointmentId: idSchema,
  fromUserId: idSchema,
  roleFrom: reviewRoleSchema,
  toUserId: idSchema,
  roleTo: reviewRoleSchema,
  rating: z.number(),
  comment: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  fromUser: z.object({
    id: idSchema,
    name: z.string(),
    avatar: z.string().optional(),
  }).optional(),
  toUser: z.object({
    id: idSchema,
    name: z.string(),
    avatar: z.string().optional(),
  }).optional(),
  appointment: z.object({
    id: idSchema,
    subcategory: z.object({
      id: z.number(),
      name: z.string(),
    }),
  }).optional(),
});

export const professionalRatingStatsSchema = z.object({
  userId: idSchema,
  averageRating: z.number(),
  totalReviews: z.number(),
  ratingDistribution: z.object({
    '1': z.number(),
    '2': z.number(),
    '3': z.number(),
    '4': z.number(),
    '5': z.number(),
  }),
});

// ============================================
// TYPES
// ============================================

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type GetReviewsQuery = z.infer<typeof getReviewsQuerySchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
export type ProfessionalRatingStats = z.infer<typeof professionalRatingStatsSchema>;

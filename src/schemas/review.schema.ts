import { z } from 'zod';
import { idSchema, ratingSchema } from './common.schema.js';

// ============================================
// CRIAR AVALIAÇÃO
// ============================================

export const createReviewSchema = z.object({
  appointmentId: idSchema,
  rating: ratingSchema,
  comment: z.string().min(10, 'Comentário deve ter no mínimo 10 caracteres').max(1000, 'Comentário não pode exceder 1000 caracteres').optional(),
  punctuality: ratingSchema.optional(),
  quality: ratingSchema.optional(),
  communication: ratingSchema.optional(),
});

// ============================================
// ATUALIZAR AVALIAÇÃO
// ============================================

export const updateReviewSchema = z.object({
  rating: ratingSchema.optional(),
  comment: z.string().min(10).max(1000).optional(),
  punctuality: ratingSchema.optional(),
  quality: ratingSchema.optional(),
  communication: ratingSchema.optional(),
});

// ============================================
// BUSCAR AVALIAÇÕES
// ============================================

export const getReviewsQuerySchema = z.object({
  professionalId: idSchema.optional(),
  clientId: idSchema.optional(),
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

export const professionalReviewsParamSchema = z.object({
  professionalId: idSchema,
});

// ============================================
// RESPONSES
// ============================================

export const reviewResponseSchema = z.object({
  id: idSchema,
  appointmentId: idSchema,
  clientId: idSchema,
  professionalId: idSchema,
  rating: z.number(),
  comment: z.string().optional(),
  punctuality: z.number().optional(),
  quality: z.number().optional(),
  communication: z.number().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  client: z.object({
    id: idSchema,
    name: z.string(),
    avatar: z.string().optional(),
  }).optional(),
  professional: z.object({
    id: idSchema,
    name: z.string(),
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
  professionalId: idSchema,
  averageRating: z.number(),
  totalReviews: z.number(),
  ratingDistribution: z.object({
    '1': z.number(),
    '2': z.number(),
    '3': z.number(),
    '4': z.number(),
    '5': z.number(),
  }),
  averagePunctuality: z.number().optional(),
  averageQuality: z.number().optional(),
  averageCommunication: z.number().optional(),
});

// ============================================
// TYPES
// ============================================

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type GetReviewsQuery = z.infer<typeof getReviewsQuerySchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
export type ProfessionalRatingStats = z.infer<typeof professionalRatingStatsSchema>;

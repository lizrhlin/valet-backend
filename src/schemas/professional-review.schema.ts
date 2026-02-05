import { z } from 'zod';

export const createProfessionalReviewSchema = z.object({
  appointmentId: z.string({
    required_error: 'Appointment ID is required',
  }),
  rating: z.number().int().min(1).max(5, {
    invalid_type_error: 'Rating must be a number',
    required_error: 'Rating is required',
  }),
  comment: z.string().optional(),
  punctuality: z.number().int().min(1).max(5).optional(),
  respectful: z.number().int().min(1).max(5).optional(),
  payment: z.number().int().min(1).max(5).optional(),
});

export const professionalReviewIdParamSchema = z.object({
  reviewId: z.string(),
});

export const clientReviewsParamSchema = z.object({
  clientId: z.string(),
});

export const getProfessionalReviewsQuerySchema = z.object({
  professionalId: z.string().optional(),
  clientId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

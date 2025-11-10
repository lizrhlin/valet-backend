import { z } from 'zod';
import { idSchema } from './common.schema.js';

// ============================================
// ENUMS
// ============================================

export const notificationTypeSchema = z.enum([
  'INFO',
  'SUCCESS',
  'WARNING',
  'ERROR',
  'BOOKING',
  'CHAT',
  'REVIEW',
  'SYSTEM',
]);

export type NotificationType = z.infer<typeof notificationTypeSchema>;

// ============================================
// CRIAR NOTIFICAÇÃO
// ============================================

export const createNotificationSchema = z.object({
  userId: idSchema,
  type: notificationTypeSchema,
  title: z.string().min(1, 'Título é obrigatório').max(100, 'Título não pode exceder 100 caracteres'),
  message: z.string().min(1, 'Mensagem é obrigatória').max(500, 'Mensagem não pode exceder 500 caracteres'),
  data: z.record(z.any()).optional(), // JSON object
});

// ============================================
// MARCAR COMO LIDA
// ============================================

export const markAsReadSchema = z.object({
  notificationId: idSchema,
});

export const markAllAsReadSchema = z.object({
  type: notificationTypeSchema.optional(),
});

// ============================================
// BUSCAR NOTIFICAÇÕES
// ============================================

export const getNotificationsQuerySchema = z.object({
  type: notificationTypeSchema.optional(),
  isRead: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================
// PARAMS
// ============================================

export const notificationIdParamSchema = z.object({
  notificationId: idSchema,
});

// ============================================
// RESPONSES
// ============================================

export const notificationResponseSchema = z.object({
  id: idSchema,
  userId: idSchema,
  type: notificationTypeSchema,
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).optional(),
  isRead: z.boolean(),
  createdAt: z.string().datetime(),
});

export const notificationStatsSchema = z.object({
  total: z.number(),
  unread: z.number(),
  byType: z.object({
    INFO: z.number(),
    SUCCESS: z.number(),
    WARNING: z.number(),
    ERROR: z.number(),
    BOOKING: z.number(),
    CHAT: z.number(),
    REVIEW: z.number(),
    SYSTEM: z.number(),
  }),
});

// ============================================
// TYPES
// ============================================

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
export type MarkAllAsReadInput = z.infer<typeof markAllAsReadSchema>;
export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>;
export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
export type NotificationStats = z.infer<typeof notificationStatsSchema>;

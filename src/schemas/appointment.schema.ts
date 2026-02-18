import { z } from 'zod';
import { idSchema, timeSchema } from './common.schema.js';

// ============================================
// ENUMS
// ============================================

export const appointmentStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'ON_WAY',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
]);

export const paymentMethodSchema = z.enum(['CASH', 'CARD', 'PIX']);
export const paymentStatusSchema = z.enum(['PENDING', 'PAID', 'REFUNDED']);

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// ============================================
// CRIAR AGENDAMENTO
// ============================================

export const createAppointmentSchema = z.object({
  professionalId: idSchema,
  subcategoryId: z.string().regex(/^\d+$/, 'subcategoryId deve ser um número'), // ✅ Aceitar string numérica
  addressId: idSchema,
  scheduledDate: z.string().datetime('Data inválida'),
  scheduledTime: timeSchema,
  notes: z.string().max(1000, 'Observações não podem exceder 1000 caracteres').optional(),
});

// ============================================
// ATUALIZAR AGENDAMENTO
// ============================================

export const updateAppointmentSchema = z.object({
  scheduledDate: z.string().datetime('Data inválida').optional(),
  scheduledTime: timeSchema.optional(),
  notes: z.string().max(1000, 'Observações não podem exceder 1000 caracteres').optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: appointmentStatusSchema,
  cancellationReason: z.string().max(500).optional(),
});

export const rescheduleAppointmentSchema = z.object({
  scheduledDate: z.string().datetime('Data inválida'),
  scheduledTime: timeSchema,
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const rateAppointmentSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const updatePaymentSchema = z.object({
  paymentMethod: paymentMethodSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
});

// ============================================
// BUSCAR AGENDAMENTOS
// ============================================

export const getAppointmentsQuerySchema = z.object({
  status: appointmentStatusSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

// ============================================
// VERIFICAR DISPONIBILIDADE
// ============================================

export const checkAvailabilitySchema = z.object({
  professionalId: idSchema,
  date: z.string().datetime('Data inválida'),
  duration: z.number().int().positive('Duração deve ser positiva').optional().default(60),
});

// ============================================
// PARAMS
// ============================================

export const appointmentIdParamSchema = z.object({
  appointmentId: idSchema,
});

// ============================================
// RESPONSES
// ============================================

export const appointmentResponseSchema = z.object({
  id: idSchema,
  orderNumber: z.string(),
  clientId: idSchema,
  professionalId: idSchema,
  subcategoryId: z.number(),
  addressId: idSchema,
  scheduledDate: z.string().datetime(),
  scheduledTime: z.string(),
  estimatedDuration: z.number().optional(),
  actualDuration: z.number().optional(),
  status: appointmentStatusSchema,
  price: z.number(),
  paymentMethod: paymentMethodSchema.optional(),
  paymentStatus: paymentStatusSchema,
  notes: z.string().optional(),
  cancellationReason: z.string().optional(),
  confirmedAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  cancelledAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  client: z.object({
    id: idSchema,
    name: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
  }).optional(),
  professional: z.object({
    id: idSchema,
    name: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
  }).optional(),
  subcategory: z.object({
    id: z.number(),
    name: z.string(),
    categoryId: z.number(),
  }).optional(),
  address: z.object({
    id: idSchema,
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  }).optional(),
});

export const availableTimeSlotsResponseSchema = z.object({
  date: z.string(),
  availableSlots: z.array(z.object({
    time: z.string(),
    available: z.boolean(),
  })),
});

// ============================================
// TYPES
// ============================================

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type GetAppointmentsQuery = z.infer<typeof getAppointmentsQuerySchema>;
export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;
export type AppointmentResponse = z.infer<typeof appointmentResponseSchema>;
export type AvailableTimeSlotsResponse = z.infer<typeof availableTimeSlotsResponseSchema>;

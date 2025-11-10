import { z } from 'zod';
import { idSchema } from './common.schema.js';

// ============================================
// ENUMS
// ============================================

export const messageStatusSchema = z.enum(['SENT', 'DELIVERED', 'READ']);

export type MessageStatus = z.infer<typeof messageStatusSchema>;

// ============================================
// CRIAR CHAT
// ============================================

export const createChatSchema = z.object({
  appointmentId: idSchema.optional(),
  participantIds: z.array(idSchema).min(2, 'Chat deve ter pelo menos 2 participantes'),
});

// ============================================
// ENVIAR MENSAGEM
// ============================================

export const sendMessageSchema = z.object({
  chatId: idSchema,
  content: z.string().min(1, 'Mensagem não pode estar vazia').max(2000, 'Mensagem não pode exceder 2000 caracteres'),
  attachments: z.array(z.string().url()).optional(),
  appointmentId: idSchema.optional(),
});

// ============================================
// ATUALIZAR STATUS DA MENSAGEM
// ============================================

export const updateMessageStatusSchema = z.object({
  status: messageStatusSchema,
});

// ============================================
// MARCAR MENSAGENS COMO LIDAS
// ============================================

export const markMessagesAsReadSchema = z.object({
  chatId: idSchema,
});

// ============================================
// BUSCAR MENSAGENS
// ============================================

export const getMessagesQuerySchema = z.object({
  chatId: idSchema,
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const getChatsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// ============================================
// PARAMS
// ============================================

export const chatIdParamSchema = z.object({
  chatId: idSchema,
});

export const messageIdParamSchema = z.object({
  messageId: idSchema,
});

// ============================================
// RESPONSES
// ============================================

export const messageResponseSchema = z.object({
  id: idSchema,
  chatId: idSchema,
  senderId: idSchema,
  appointmentId: idSchema.optional(),
  content: z.string(),
  status: messageStatusSchema,
  attachments: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sender: z.object({
    id: idSchema,
    name: z.string(),
    avatar: z.string().optional(),
  }).optional(),
});

export const chatParticipantResponseSchema = z.object({
  id: idSchema,
  userId: idSchema,
  lastReadAt: z.string().datetime().optional(),
  joinedAt: z.string().datetime(),
  user: z.object({
    id: idSchema,
    name: z.string(),
    avatar: z.string().optional(),
  }).optional(),
});

export const chatResponseSchema = z.object({
  id: idSchema,
  appointmentId: idSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  participants: z.array(chatParticipantResponseSchema).optional(),
  lastMessage: messageResponseSchema.optional(),
  unreadCount: z.number().optional(),
  appointment: z.object({
    id: idSchema,
    orderNumber: z.string(),
    status: z.string(),
    subcategory: z.object({
      id: z.number(),
      name: z.string(),
    }),
  }).optional(),
});

// ============================================
// TYPES
// ============================================

export type CreateChatInput = z.infer<typeof createChatSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type UpdateMessageStatusInput = z.infer<typeof updateMessageStatusSchema>;
export type MarkMessagesAsReadInput = z.infer<typeof markMessagesAsReadSchema>;
export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;
export type GetChatsQuery = z.infer<typeof getChatsQuerySchema>;
export type MessageResponse = z.infer<typeof messageResponseSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ChatParticipantResponse = z.infer<typeof chatParticipantResponseSchema>;

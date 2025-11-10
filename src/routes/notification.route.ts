import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  getNotificationsQuerySchema,
  notificationIdParamSchema,
  createNotificationSchema,
} from '../schemas/notification.schema.js';
import { authenticate } from '../utils/auth.js';

const notificationRoute: FastifyPluginAsync = async (fastify) => {
  // Todas as rotas requerem autenticação
  fastify.addHook('onRequest', authenticate);

  // Listar notificações do usuário
  fastify.get(
    '/notifications',
    {
      schema: {
        tags: ['notifications'],
        description: 'List user notifications',
        querystring: getNotificationsQuerySchema,
      },
    },
    async (request) => {
      const userId = request.user.userId;
      const { type, isRead, page = 1, limit = 20 } = request.query as z.infer<typeof getNotificationsQuerySchema>;

      const where: any = { userId };
      if (type) where.type = type;
      if (isRead !== undefined) where.isRead = isRead;

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        fastify.prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        fastify.prisma.notification.count({ where }),
      ]);

      return {
        data: notifications.map(notif => ({
          ...notif,
          createdAt: notif.createdAt.toISOString(),
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
  );

  // Buscar notificação por ID
  fastify.get<{ Params: { notificationId: string } }>(
    '/notifications/:notificationId',
    {
      schema: {
        tags: ['notifications'],
        description: 'Get notification by ID',
        params: notificationIdParamSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { notificationId } = request.params;

      const notification = await fastify.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        reply.code(404);
        return { error: 'Notification not found' };
      }

      if (notification.userId !== userId) {
        reply.code(403);
        return { error: 'Access denied' };
      }

      return {
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      };
    }
  );

  // Criar notificação (apenas admin ou sistema)
  fastify.post(
    '/notifications',
    {
      schema: {
        tags: ['notifications'],
        description: 'Create notification (admin only)',
        body: createNotificationSchema,
      },
    },
    async (request, reply) => {
      const currentUser = await fastify.prisma.user.findUnique({
        where: { id: request.user.userId },
      });

      if (currentUser?.userType !== 'ADMIN') {
        reply.code(403);
        return { error: 'Only admins can create notifications' };
      }

      const data = request.body as z.infer<typeof createNotificationSchema>;

      const notification = await fastify.prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data as any,
        },
      });

      reply.code(201);
      return {
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      };
    }
  );

  // Marcar notificação como lida
  fastify.patch<{ Params: { notificationId: string } }>(
    '/notifications/:notificationId/read',
    {
      schema: {
        tags: ['notifications'],
        description: 'Mark notification as read',
        params: notificationIdParamSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { notificationId } = request.params;

      const notification = await fastify.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        reply.code(404);
        return { error: 'Notification not found' };
      }

      if (notification.userId !== userId) {
        reply.code(403);
        return { error: 'Access denied' };
      }

      const updated = await fastify.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      };
    }
  );

  // Marcar todas como lidas
  fastify.patch(
    '/notifications/read-all',
    {
      schema: {
        tags: ['notifications'],
        description: 'Mark all notifications as read',
        body: z.object({
          type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'BOOKING', 'CHAT', 'REVIEW', 'SYSTEM']).optional(),
        }),
      },
    },
    async (request) => {
      const userId = request.user.userId;
      const { type } = request.body as { type?: string };

      const where: any = { userId, isRead: false };
      if (type) where.type = type;

      const result = await fastify.prisma.notification.updateMany({
        where,
        data: { isRead: true },
      });

      return { message: `Marked ${result.count} notifications as read` };
    }
  );

  // Deletar notificação
  fastify.delete<{ Params: { notificationId: string } }>(
    '/notifications/:notificationId',
    {
      schema: {
        tags: ['notifications'],
        description: 'Delete notification',
        params: notificationIdParamSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { notificationId } = request.params;

      const notification = await fastify.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        reply.code(404);
        return { error: 'Notification not found' };
      }

      if (notification.userId !== userId) {
        reply.code(403);
        return { error: 'Access denied' };
      }

      await fastify.prisma.notification.delete({
        where: { id: notificationId },
      });

      return { message: 'Notification deleted successfully' };
    }
  );

  // Deletar todas as notificações lidas
  fastify.delete(
    '/notifications/clear-read',
    {
      schema: {
        tags: ['notifications'],
        description: 'Delete all read notifications',
      },
    },
    async (request) => {
      const userId = request.user.userId;

      const result = await fastify.prisma.notification.deleteMany({
        where: { userId, isRead: true },
      });

      return { message: `Deleted ${result.count} notifications` };
    }
  );

  // Obter estatísticas de notificações
  fastify.get(
    '/notifications/stats',
    {
      schema: {
        tags: ['notifications'],
        description: 'Get notification statistics',
      },
    },
    async (request) => {
      const userId = request.user.userId;

      const [total, unread, byType] = await Promise.all([
        fastify.prisma.notification.count({ where: { userId } }),
        fastify.prisma.notification.count({ where: { userId, isRead: false } }),
        fastify.prisma.notification.groupBy({
          by: ['type'],
          where: { userId },
          _count: { type: true },
        }),
      ]);

      const typeStats = {
        INFO: 0,
        SUCCESS: 0,
        WARNING: 0,
        ERROR: 0,
        BOOKING: 0,
        CHAT: 0,
        REVIEW: 0,
        SYSTEM: 0,
      };

      byType.forEach((item) => {
        typeStats[item.type as keyof typeof typeStats] = item._count.type;
      });

      return {
        total,
        unread,
        byType: typeStats,
      };
    }
  );

  // Buscar notificações não lidas
  fastify.get(
    '/notifications/unread',
    {
      schema: {
        tags: ['notifications'],
        description: 'Get unread notifications',
        querystring: z.object({
          limit: z.coerce.number().int().positive().max(100).default(20),
        }),
      },
    },
    async (request) => {
      const userId = request.user.userId;
      const { limit = 20 } = request.query as { limit?: number };

      const notifications = await fastify.prisma.notification.findMany({
        where: { userId, isRead: false },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return notifications.map(notif => ({
        ...notif,
        createdAt: notif.createdAt.toISOString(),
      }));
    }
  );
};

export default notificationRoute;

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  createReviewSchema,
  getReviewsQuerySchema,
  reviewIdParamSchema,
  professionalReviewsParamSchema,
} from '../schemas/review.schema.js';
import { authenticate } from '../utils/auth.js';

const reviewRoute: FastifyPluginAsync = async (fastify) => {
  // Todas as rotas requerem autenticação
  fastify.addHook('onRequest', authenticate);

  // Criar avaliação
  fastify.post(
    '/reviews',
    {
      schema: {
        tags: ['reviews'],
        description: 'Create a review for an appointment',
        body: createReviewSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const data = request.body as z.infer<typeof createReviewSchema>;

      // Verificar se o agendamento existe
      const appointment = await fastify.prisma.appointment.findUnique({
        where: { id: data.appointmentId },
        include: {
          client: { select: { userType: true } },
          professional: { select: { userType: true } },
        },
      });

      if (!appointment) {
        reply.code(404);
        return { error: 'Appointment not found' };
      }

      // Verificar se o usuário faz parte do agendamento
      const isClient = appointment.clientId === userId;
      const isProfessional = appointment.professionalId === userId;
      
      if (!isClient && !isProfessional) {
        reply.code(403);
        return { error: 'You can only review your own appointments' };
      }

      // Verificar se o agendamento está completo
      if (appointment.status !== 'COMPLETED') {
        reply.code(400);
        return { error: 'Only completed appointments can be reviewed' };
      }

      // Verificar se já existe avaliação deste usuário para este appointment
      const existingReview = await fastify.prisma.review.findUnique({
        where: { 
          appointmentId_fromUserId: {
            appointmentId: data.appointmentId,
            fromUserId: userId
          }
        },
      });

      if (existingReview) {
        reply.code(400);
        return { error: 'You already reviewed this appointment' };
      }

      // Determinar roles e destinatário
      const roleFrom: 'CLIENT' | 'PROFESSIONAL' = isClient ? 'CLIENT' : 'PROFESSIONAL';
      const roleTo: 'CLIENT' | 'PROFESSIONAL' = isClient ? 'PROFESSIONAL' : 'CLIENT';
      // SEMPRE usar o ID correto do appointment (ignorar data.toUserId para evitar self-review)
      const toUserId = isClient ? appointment.professionalId : appointment.clientId;

      // Guard: impedir self-review
      if (toUserId === userId) {
        reply.code(400);
        return { error: 'You cannot review yourself' };
      }

      // Criar avaliação
      const review = await fastify.prisma.review.create({
        data: {
          appointmentId: data.appointmentId,
          fromUserId: userId,
          roleFrom,
          toUserId,
          roleTo,
          rating: data.rating,
          comment: data.comment,
        },
        include: {
          fromUser: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          appointment: {
            select: {
              id: true,
              subcategory: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Recalcular rating médio do usuário avaliado
      await recalculateUserRating(fastify, toUserId);

      reply.code(201);
      return {
        ...review,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      };
    }
  );

  // Listar avaliações
  fastify.get(
    '/reviews',
    {
      schema: {
        tags: ['reviews'],
        description: 'List reviews with filters',
        querystring: getReviewsQuerySchema,
      },
    },
    async (request) => {
      const { userId, fromUserId, roleTo, minRating, page = 1, limit = 10 } = request.query as z.infer<typeof getReviewsQuerySchema>;

      const where: any = {};
      if (userId) where.toUserId = userId;       // Reviews RECEBIDAS
      if (fromUserId) where.fromUserId = fromUserId; // Reviews FEITAS
      if (roleTo) where.roleTo = roleTo;
      if (minRating) where.rating = { gte: minRating };

      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        fastify.prisma.review.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            fromUser: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            toUser: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            appointment: {
              select: {
                id: true,
                subcategory: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        fastify.prisma.review.count({ where }),
      ]);

      return {
        data: reviews.map(review => ({
          ...review,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
  );

  // Buscar avaliação por ID
  fastify.get<{ Params: { reviewId: string } }>(
    '/reviews/:reviewId',
    {
      schema: {
        tags: ['reviews'],
        description: 'Get review by ID',
        params: reviewIdParamSchema,
      },
    },
    async (request, reply) => {
      const { reviewId } = request.params;

      const review = await fastify.prisma.review.findUnique({
        where: { id: reviewId },
        include: {
          fromUser: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          toUser: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          appointment: {
            select: {
              id: true,
              subcategory: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!review) {
        reply.code(404);
        return { error: 'Review not found' };
      }

      return {
        ...review,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      };
    }
  );

  // Verificar se um appointment já foi avaliado pelo usuário logado
  fastify.get<{ Params: { appointmentId: string } }>(
    '/reviews/appointment/:appointmentId',
    {
      schema: {
        tags: ['reviews'],
        description: 'Check if an appointment has been reviewed by the logged user',
        params: z.object({
          appointmentId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { appointmentId } = request.params;
      const userId = request.user.userId;

      const review = await fastify.prisma.review.findUnique({
        where: { 
          appointmentId_fromUserId: {
            appointmentId,
            fromUserId: userId,
          }
        },
        include: {
          fromUser: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          toUser: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          appointment: {
            select: {
              id: true,
              subcategory: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!review) {
        reply.code(404);
        return { reviewed: false };
      }

      return {
        reviewed: true,
        review: {
          ...review,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
        },
      };
    }
  );

  // Listar avaliações de um profissional
  fastify.get<{ Params: { professionalId: string } }>(
    '/reviews/professional/:professionalId',
    {
      schema: {
        tags: ['reviews'],
        description: 'List reviews of a professional',
        params: professionalReviewsParamSchema,
        querystring: z.object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().max(50).default(10),
        }),
      },
    },
    async (request) => {
      const { professionalId } = request.params;
      const { page = 1, limit = 10 } = request.query as { page?: number; limit?: number };

      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        fastify.prisma.review.findMany({
          where: { 
            toUserId: professionalId,
            roleTo: 'PROFESSIONAL'
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            fromUser: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            appointment: {
              select: {
                id: true,
                subcategory: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        fastify.prisma.review.count({ 
          where: { 
            toUserId: professionalId,
            roleTo: 'PROFESSIONAL'
          } 
        }),
      ]);

      return {
        data: reviews.map(review => ({
          ...review,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
  );

  // Estatísticas de avaliação de um usuário (profissional ou cliente)
  fastify.get<{ Params: { userId: string } }>(
    '/reviews/user/:userId/stats',
    {
      schema: {
        tags: ['reviews'],
        description: 'Get rating statistics of a user',
        params: professionalReviewsParamSchema,
      },
    },
    async (request, reply) => {
      const { userId } = request.params;

      // Verificar se usuário existe
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        reply.code(404);
        return { error: 'User not found' };
      }

      // Buscar avaliações RECEBIDAS filtradas por papel
      // Se profissional, contar reviews onde roleTo=PROFESSIONAL
      // Se cliente (ou query genérica), contar reviews onde roleTo=CLIENT
      const isProfessional = user.userType === 'PROFESSIONAL';

      // Stats como profissional
      const proReviews = await fastify.prisma.review.findMany({
        where: { toUserId: userId, roleTo: 'PROFESSIONAL' },
      });

      // Stats como cliente
      const clientReviews = await fastify.prisma.review.findMany({
        where: { toUserId: userId, roleTo: 'CLIENT' },
      });

      // Retornar stats do papel principal do usuário
      const relevantReviews = isProfessional ? proReviews : clientReviews;

      if (relevantReviews.length === 0) {
        return {
          userId,
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          // Incluir stats do outro papel
          ...(isProfessional ? {
            clientRatingAvg: clientReviews.length > 0 ? Math.round(clientReviews.reduce((s, r) => s + r.rating, 0) / clientReviews.length * 10) / 10 : 0,
            clientReviewCount: clientReviews.length,
          } : {
            professionalRatingAvg: proReviews.length > 0 ? Math.round(proReviews.reduce((s, r) => s + r.rating, 0) / proReviews.length * 10) / 10 : 0,
            professionalReviewCount: proReviews.length,
          }),
        };
      }

      // Calcular estatísticas
      const totalReviews = relevantReviews.length;
      const sumRating = relevantReviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = sumRating / totalReviews;

      // Distribuição de ratings
      const ratingDistribution = {
        '1': relevantReviews.filter(r => r.rating === 1).length,
        '2': relevantReviews.filter(r => r.rating === 2).length,
        '3': relevantReviews.filter(r => r.rating === 3).length,
        '4': relevantReviews.filter(r => r.rating === 4).length,
        '5': relevantReviews.filter(r => r.rating === 5).length,
      };

      return {
        userId,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        ratingDistribution,
        // Incluir stats do outro papel
        ...(isProfessional ? {
          clientRatingAvg: clientReviews.length > 0 ? Math.round(clientReviews.reduce((s, r) => s + r.rating, 0) / clientReviews.length * 10) / 10 : 0,
          clientReviewCount: clientReviews.length,
        } : {
          professionalRatingAvg: proReviews.length > 0 ? Math.round(proReviews.reduce((s, r) => s + r.rating, 0) / proReviews.length * 10) / 10 : 0,
          professionalReviewCount: proReviews.length,
        }),
      };
    }
  );

  // Deletar avaliação (apenas admin ou autor)
  fastify.delete<{ Params: { reviewId: string } }>(
    '/reviews/:reviewId',
    {
      schema: {
        tags: ['reviews'],
        description: 'Delete review (admin or author only)',
        params: reviewIdParamSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { reviewId } = request.params;

      const review = await fastify.prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        reply.code(404);
        return { error: 'Review not found' };
      }

      // Verificar permissão
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (review.fromUserId !== userId && user?.userType !== 'ADMIN') {
        reply.code(403);
        return { error: 'Only the author or admin can delete reviews' };
      }

      const targetUserId = review.toUserId;

      await fastify.prisma.review.delete({
        where: { id: reviewId },
      });

      // Recalcular rating
      await recalculateUserRating(fastify, targetUserId);

      return { message: 'Review deleted successfully' };
    }
  );
};

// Função auxiliar para recalcular rating de um usuário (profissional ou cliente)
async function recalculateUserRating(fastify: any, userId: string) {
  const user = await fastify.prisma.user.findUnique({
    where: { id: userId },
    select: { userType: true },
  });

  if (user?.userType === 'PROFESSIONAL') {
    // Profissional: contar apenas reviews onde roleTo = PROFESSIONAL
    const reviews = await fastify.prisma.review.findMany({
      where: { toUserId: userId, roleTo: 'PROFESSIONAL' },
      select: { rating: true },
    });

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : 0;

    await fastify.prisma.professionalProfile.update({
      where: { userId },
      data: {
        ratingAvg: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length,
      },
    });
  }

  // Atualizar rating como cliente (qualquer usuário pode receber review como cliente)
  const clientReviews = await fastify.prisma.review.findMany({
    where: { toUserId: userId, roleTo: 'CLIENT' },
    select: { rating: true },
  });

  const clientAvg = clientReviews.length > 0
    ? clientReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / clientReviews.length
    : 0;

  await fastify.prisma.user.update({
    where: { id: userId },
    data: {
      clientRatingAvg: Math.round(clientAvg * 10) / 10,
      clientReviewCount: clientReviews.length,
    },
  });
}

export default reviewRoute;

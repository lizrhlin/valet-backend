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
      });

      if (!appointment) {
        reply.code(404);
        return { error: 'Appointment not found' };
      }

      // Verificar se o usuário é o cliente do agendamento
      if (appointment.clientId !== userId) {
        reply.code(403);
        return { error: 'Only the client can review the appointment' };
      }

      // Verificar se o agendamento está completo
      if (appointment.status !== 'COMPLETED') {
        reply.code(400);
        return { error: 'Only completed appointments can be reviewed' };
      }

      // Verificar se já existe avaliação
      const existingReview = await fastify.prisma.review.findUnique({
        where: { appointmentId: data.appointmentId },
      });

      if (existingReview) {
        reply.code(400);
        return { error: 'Appointment already reviewed' };
      }

      // Criar avaliação
      const review = await fastify.prisma.review.create({
        data: {
          appointmentId: data.appointmentId,
          clientId: userId,
          professionalId: appointment.professionalId,
          rating: data.rating,
          comment: data.comment,
          punctuality: data.punctuality,
          quality: data.quality,
          communication: data.communication,
        },
        include: {
          client: {
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

      // Recalcular rating médio do profissional
      await recalculateProfessionalRating(fastify, appointment.professionalId);

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
      const { professionalId, clientId, minRating, page = 1, limit = 10 } = request.query as z.infer<typeof getReviewsQuerySchema>;

      const where: any = {};
      if (professionalId) where.professionalId = professionalId;
      if (clientId) where.clientId = clientId;
      if (minRating) where.rating = { gte: minRating };

      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        fastify.prisma.review.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
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
          client: {
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
          where: { professionalId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
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
        fastify.prisma.review.count({ where: { professionalId } }),
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

  // Estatísticas de avaliação de um profissional
  fastify.get<{ Params: { professionalId: string } }>(
    '/reviews/professional/:professionalId/stats',
    {
      schema: {
        tags: ['reviews'],
        description: 'Get rating statistics of a professional',
        params: professionalReviewsParamSchema,
      },
    },
    async (request, reply) => {
      const { professionalId } = request.params;

      // Verificar se profissional existe
      const professional = await fastify.prisma.professional.findUnique({
        where: { id: professionalId },
      });

      if (!professional) {
        reply.code(404);
        return { error: 'Professional not found' };
      }

      // Buscar todas as avaliações
      const reviews = await fastify.prisma.review.findMany({
        where: { professionalId },
      });

      if (reviews.length === 0) {
        return {
          professionalId,
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          averagePunctuality: null,
          averageQuality: null,
          averageCommunication: null,
        };
      }

      // Calcular estatísticas
      const totalReviews = reviews.length;
      const sumRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = sumRating / totalReviews;

      // Distribuição de ratings
      const ratingDistribution = {
        '1': reviews.filter(r => r.rating === 1).length,
        '2': reviews.filter(r => r.rating === 2).length,
        '3': reviews.filter(r => r.rating === 3).length,
        '4': reviews.filter(r => r.rating === 4).length,
        '5': reviews.filter(r => r.rating === 5).length,
      };

      // Médias de aspectos específicos
      const punctualityReviews = reviews.filter(r => r.punctuality !== null);
      const averagePunctuality = punctualityReviews.length > 0
        ? punctualityReviews.reduce((sum, r) => sum + (r.punctuality || 0), 0) / punctualityReviews.length
        : null;

      const qualityReviews = reviews.filter(r => r.quality !== null);
      const averageQuality = qualityReviews.length > 0
        ? qualityReviews.reduce((sum, r) => sum + (r.quality || 0), 0) / qualityReviews.length
        : null;

      const communicationReviews = reviews.filter(r => r.communication !== null);
      const averageCommunication = communicationReviews.length > 0
        ? communicationReviews.reduce((sum, r) => sum + (r.communication || 0), 0) / communicationReviews.length
        : null;

      return {
        professionalId,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        ratingDistribution,
        averagePunctuality: averagePunctuality ? Math.round(averagePunctuality * 10) / 10 : null,
        averageQuality: averageQuality ? Math.round(averageQuality * 10) / 10 : null,
        averageCommunication: averageCommunication ? Math.round(averageCommunication * 10) / 10 : null,
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

      if (review.clientId !== userId && user?.userType !== 'ADMIN') {
        reply.code(403);
        return { error: 'Only the author or admin can delete reviews' };
      }

      const professionalId = review.professionalId;

      await fastify.prisma.review.delete({
        where: { id: reviewId },
      });

      // Recalcular rating
      await recalculateProfessionalRating(fastify, professionalId);

      return { message: 'Review deleted successfully' };
    }
  );
};

// Função auxiliar para recalcular rating do profissional
async function recalculateProfessionalRating(fastify: any, professionalId: string) {
  const reviews = await fastify.prisma.review.findMany({
    where: { professionalId },
  });

  if (reviews.length === 0) {
    await fastify.prisma.professional.update({
      where: { id: professionalId },
      data: {
        rating: 0,
        reviewCount: 0,
      },
    });
    return;
  }

  const avgRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
  const totalReviews = reviews.length;

  await fastify.prisma.professional.update({
    where: { id: professionalId },
    data: {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: totalReviews,
    },
  });
}

export default reviewRoute;

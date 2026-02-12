import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  createProfessionalReviewSchema,
  getProfessionalReviewsQuerySchema,
  professionalReviewIdParamSchema,
  clientReviewsParamSchema,
} from '../schemas/professional-review.schema.js';
import { authenticate } from '../utils/auth.js';

const professionalReviewRoute: FastifyPluginAsync = async (fastify) => {
  // Função auxiliar para recalcular rating do cliente
  async function recalculateClientRating(clientId: string) {
    const reviews = await fastify.prisma.professionalReview.findMany({
      where: { clientId },
    });

    if (reviews.length === 0) {
      return;
    }

    const avgRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

    // Nota: Atualmente não há campo de rating para clientes no User
    // Você pode adicionar se necessário
  }

  // Todas as rotas requerem autenticação
  fastify.addHook('onRequest', authenticate);

  // Criar avaliação do cliente (feita pelo profissional)
  fastify.post(
    '/professional-reviews',
    {
      schema: {
        tags: ['professional-reviews'],
        description: 'Create a review of a client by a professional',
        body: createProfessionalReviewSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const data = request.body as z.infer<typeof createProfessionalReviewSchema>;

      // Verificar se o agendamento existe
      const appointment = await fastify.prisma.appointment.findUnique({
        where: { id: data.appointmentId },
      });

      if (!appointment) {
        reply.code(404);
        return { error: 'Appointment not found' };
      }

      // Verificar se o usuário é o profissional do agendamento
      if (appointment.professionalId !== userId) {
        reply.code(403);
        return { error: 'Only the professional can review the client' };
      }

      // Verificar se o agendamento está completo
      if (appointment.status !== 'COMPLETED') {
        reply.code(400);
        return { error: 'Only completed appointments can be reviewed' };
      }

      // Verificar se já existe avaliação
      const existingReview = await fastify.prisma.professionalReview.findUnique({
        where: { appointmentId: data.appointmentId },
      });

      if (existingReview) {
        reply.code(400);
        return { error: 'Client already reviewed for this appointment' };
      }

      // Criar avaliação do cliente
      const review = await fastify.prisma.professionalReview.create({
        data: {
          appointmentId: data.appointmentId,
          professionalId: userId,
          clientId: appointment.clientId,
          rating: data.rating,
          comment: data.comment,
          punctuality: data.punctuality,
          respectful: data.respectful,
          payment: data.payment,
        },
        include: {
          professional: {
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

      // Recalcular rating médio do cliente
      await recalculateClientRating(appointment.clientId);

      reply.code(201);
      return {
        ...review,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      };
    }
  );

  // Listar todas as avaliações (com filtros opcionais)
  fastify.get(
    '/professional-reviews',
    {
      schema: {
        tags: ['professional-reviews'],
        description: 'List professional reviews with optional filters',
        querystring: getProfessionalReviewsQuerySchema,
      },
    },
    async (request) => {
      const { professionalId, clientId, page = 1, limit = 10 } = request.query as z.infer<
        typeof getProfessionalReviewsQuerySchema
      >;

      const skip = (page - 1) * limit;

      const where: any = {};
      if (professionalId) where.professionalId = professionalId;
      if (clientId) where.clientId = clientId;

      const [reviews, total] = await Promise.all([
        fastify.prisma.professionalReview.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            professional: {
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
        fastify.prisma.professionalReview.count({ where }),
      ]);

      return {
        data: reviews.map((review) => ({
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
    '/professional-reviews/:reviewId',
    {
      schema: {
        tags: ['professional-reviews'],
        description: 'Get professional review by ID',
        params: professionalReviewIdParamSchema,
      },
    },
    async (request, reply) => {
      const { reviewId } = request.params;

      const review = await fastify.prisma.professionalReview.findUnique({
        where: { id: reviewId },
        include: {
          professional: {
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

  // Listar avaliações de um cliente (recebidas de profissionais)
  fastify.get<{ Params: { clientId: string } }>(
    '/professional-reviews/client/:clientId',
    {
      schema: {
        tags: ['professional-reviews'],
        description: 'List reviews received by a client from professionals',
        params: clientReviewsParamSchema,
        querystring: z.object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().max(50).default(10),
        }),
      },
    },
    async (request) => {
      const { clientId } = request.params;
      const { page = 1, limit = 10 } = request.query as { page?: number; limit?: number };

      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        fastify.prisma.professionalReview.findMany({
          where: { clientId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            professional: {
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
        fastify.prisma.professionalReview.count({ where: { clientId } }),
      ]);

      return {
        data: reviews.map((review) => ({
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

  // Verificar se um appointment já foi avaliado pelo profissional
  fastify.get<{ Params: { appointmentId: string } }>(
    '/professional-reviews/appointment/:appointmentId',
    {
      schema: {
        tags: ['professional-reviews'],
        description: 'Check if an appointment has been reviewed by the professional',
        params: z.object({
          appointmentId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { appointmentId } = request.params;

      const review = await fastify.prisma.professionalReview.findUnique({
        where: { appointmentId },
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
};

export default professionalReviewRoute;

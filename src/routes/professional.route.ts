import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  searchProfessionalsSchema,
  professionalIdParamSchema,
  professionalResponseSchema,
  SearchProfessionalsInput,
} from '../schemas/professional.schema.js';

const professionalRoute: FastifyPluginAsync = async (fastify) => {
  // Buscar profissionais (com filtros)
  fastify.get(
    '/professionals',
    {
      schema: {
        tags: ['professionals'],
        description: 'Search professionals with filters',
        querystring: searchProfessionalsSchema,
        response: {
          200: z.object({
            professionals: z.array(professionalResponseSchema),
            total: z.number(),
            page: z.number(),
            limit: z.number(),
            totalPages: z.number(),
          }),
        },
      },
    },
    async (request) => {
      const query = request.query as SearchProfessionalsInput;
      const { subcategoryId, categoryId, minRating, available, sortBy, sortOrder, page, limit } = query;

      // Construir filtro
      const where: any = {};

      if (available !== undefined) {
        where.available = available;
      }

      if (minRating) {
        where.rating = { gte: minRating };
      }

      if (subcategoryId) {
        where.subcategories = {
          some: {
            subcategoryId,
            isActive: true,
          },
        };
      } else if (categoryId) {
        where.categories = {
          some: {
            categoryId,
          },
        };
      }

      // Contar total
      const total = await fastify.prisma.professional.count({ where });

      // Calcular paginação
      const totalPages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;

      // Definir ordenação
      const orderBy: any = {};
      if (sortBy === 'rating') orderBy.rating = sortOrder;
      else if (sortBy === 'servicesCompleted') orderBy.servicesCompleted = sortOrder;
      else orderBy.rating = 'desc'; // default

      // Buscar profissionais
      const professionals = await fastify.prisma.professional.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
          subcategories: {
            where: { isActive: true },
            include: {
              subcategory: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  categoryId: true,
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      });

      return {
        professionals: professionals.map(prof => ({
          ...prof,
          createdAt: prof.createdAt.toISOString(),
          updatedAt: prof.updatedAt.toISOString(),
          lastSeen: prof.lastSeen?.toISOString(),
        })),
        total,
        page,
        limit,
        totalPages,
      };
    }
  );

  // Buscar profissional por ID
  fastify.get<{
    Params: { professionalId: string };
  }>(
    '/professionals/:professionalId',
    {
      schema: {
        tags: ['professionals'],
        description: 'Get professional by ID',
        params: professionalIdParamSchema,
        response: {
          200: professionalResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { professionalId } = request.params;

      const professional = await fastify.prisma.professional.findUnique({
        where: { id: professionalId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
          subcategories: {
            where: { isActive: true },
            include: {
              subcategory: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  categoryId: true,
                },
              },
            },
          },
        },
      });

      if (!professional) {
        reply.code(404);
        return { error: 'Professional not found' };
      }

      return {
        ...professional,
        createdAt: professional.createdAt.toISOString(),
        updatedAt: professional.updatedAt.toISOString(),
        lastSeen: professional.lastSeen?.toISOString(),
      };
    }
  );

  // Buscar disponibilidade do profissional
  fastify.get<{
    Params: { professionalId: string };
  }>(
    '/professionals/:professionalId/availability',
    {
      schema: {
        tags: ['professionals'],
        description: 'Get professional availability',
        params: professionalIdParamSchema,
        response: {
          200: z.object({
            availability: z.array(z.object({
              id: z.string(),
              dayOfWeek: z.number(),
              startTime: z.string(),
              endTime: z.string(),
              isActive: z.boolean(),
            })),
          }),
          404: z.object({ error: z.string() }),
        },
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

      // Buscar disponibilidade
      const availability = await fastify.prisma.availability.findMany({
        where: {
          professionalId,
          isActive: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      return { availability };
    }
  );
};

export default professionalRoute;

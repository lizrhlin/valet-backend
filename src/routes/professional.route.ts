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
      },
    },
    async (request) => {
      const query = request.query as SearchProfessionalsInput;
      const { subcategoryId, categoryId, minRating, available, sortBy, sortOrder, page, limit } = query;

      // Construir filtro
      const where: any = {
        userType: 'PROFESSIONAL', // Filtra apenas profissionais
      };

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
      const total = await fastify.prisma.user.count({ where });

      // Calcular paginação
      const totalPages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;

      // Definir ordenação
      const orderBy: any = {};
      if (sortBy === 'rating') orderBy.rating = sortOrder;
      else if (sortBy === 'servicesCompleted') orderBy.servicesCompleted = sortOrder;
      else orderBy.rating = 'desc'; // default

      // Buscar profissionais
      const professionals = await fastify.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          specialty: true,
          description: true,
          experience: true,
          servicesCompleted: true,
          available: true,
          isVerified: true,
          location: true,
          latitude: true,
          longitude: true,
          rating: true,
          reviewCount: true,
          avgResponseTime: true,
          lastSeen: true,
          createdAt: true,
          updatedAt: true,
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
      },
    },
    async (request, reply) => {
      const { professionalId } = request.params;

      const professional = await fastify.prisma.user.findUnique({
        where: { 
          id: professionalId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          specialty: true,
          description: true,
          experience: true,
          servicesCompleted: true,
          available: true,
          isVerified: true,
          location: true,
          latitude: true,
          longitude: true,
          rating: true,
          reviewCount: true,
          avgResponseTime: true,
          lastSeen: true,
          createdAt: true,
          updatedAt: true,
          userType: true,
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

      if (!professional || professional.userType !== 'PROFESSIONAL') {
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
      const professional = await fastify.prisma.user.findUnique({
        where: { 
          id: professionalId,
        },
      });

      if (!professional || professional.userType !== 'PROFESSIONAL') {
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

  // Atualizar disponibilidade do profissional
  fastify.put<{
    Params: { professionalId: string };
    Body: {
      availability: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        isActive: boolean;
      }>;
    };
  }>(
    '/professionals/:professionalId/availability',
    {
      schema: {
        tags: ['professionals'],
        description: 'Update professional availability',
        params: professionalIdParamSchema,
        body: z.object({
          availability: z.array(z.object({
            dayOfWeek: z.number().int().min(0).max(6),
            startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
            endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
            isActive: z.boolean().optional().default(true),
          })),
        }),
        response: {
          200: z.object({
            message: z.string(),
            availability: z.array(z.any()),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { professionalId } = request.params;
      const { availability } = request.body;

      // Verificar se profissional existe
      const professional = await fastify.prisma.user.findUnique({
        where: { id: professionalId },
      });

      if (!professional || professional.userType !== 'PROFESSIONAL') {
        reply.code(404);
        return { error: 'Professional not found' };
      }

      // Buscar disponibilidades existentes
      const existingAvailability = await fastify.prisma.availability.findMany({
        where: { professionalId },
      });

      // IDs das disponibilidades que vieram na requisição (usar dayOfWeek + horário como identificador)
      const incomingKeys = availability.map(a => 
        `${a.dayOfWeek}-${a.startTime}-${a.endTime}`
      );
      
      // IDs das disponibilidades existentes
      const existingKeys = existingAvailability.map(a => 
        `${a.dayOfWeek}-${a.startTime}-${a.endTime}`
      );

      // Remover disponibilidades que não estão mais na lista
      const toRemove = existingAvailability.filter(existing => {
        const key = `${existing.dayOfWeek}-${existing.startTime}-${existing.endTime}`;
        return !incomingKeys.includes(key);
      });
      
      if (toRemove.length > 0) {
        await fastify.prisma.availability.deleteMany({
          where: {
            id: { in: toRemove.map(a => a.id) },
          },
        });
      }

      // Upsert (criar ou atualizar) cada disponibilidade
      for (const avail of availability) {
        const key = `${avail.dayOfWeek}-${avail.startTime}-${avail.endTime}`;
        const existing = existingAvailability.find(e => 
          `${e.dayOfWeek}-${e.startTime}-${e.endTime}` === key
        );

        if (existing) {
          // Atualizar se já existe
          await fastify.prisma.availability.update({
            where: { id: existing.id },
            data: {
              isActive: avail.isActive ?? true,
            },
          });
        } else {
          // Criar se não existe
          await fastify.prisma.availability.create({
            data: {
              professionalId,
              dayOfWeek: avail.dayOfWeek,
              startTime: avail.startTime,
              endTime: avail.endTime,
              isActive: avail.isActive ?? true,
            },
          });
        }
      }

      // Buscar disponibilidades atualizadas para retornar
      const updatedAvailability = await fastify.prisma.availability.findMany({
        where: { professionalId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      return {
        message: 'Availability updated successfully',
        availability: updatedAvailability,
      };
    }
  );

  // Atualizar serviços do profissional
  fastify.put<{
    Params: { professionalId: string };
    Body: {
      subcategories: Array<{
        subcategoryId: number;
        price: number;
        isActive: boolean;
      }>;
    };
  }>(
    '/professionals/:professionalId/services',
    {
      schema: {
        tags: ['professionals'],
        description: 'Update professional services',
        params: professionalIdParamSchema,
        body: z.object({
          subcategories: z.array(z.object({
            subcategoryId: z.number().int().positive(),
            price: z.number().positive(),
            isActive: z.boolean().optional().default(true),
          })),
        }),
        response: {
          200: z.object({
            message: z.string(),
            subcategories: z.array(z.any()),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { professionalId } = request.params;
      const { subcategories } = request.body;

      // Verificar se profissional existe
      const professional = await fastify.prisma.user.findUnique({
        where: { id: professionalId },
      });

      if (!professional || professional.userType !== 'PROFESSIONAL') {
        reply.code(404);
        return { error: 'Professional not found' };
      }

      // Buscar subcategorias existentes
      const existingSubcategories = await fastify.prisma.professionalSubcategory.findMany({
        where: { professionalId },
      });

      // IDs das subcategorias que vieram na requisição
      const incomingSubcategoryIds = subcategories.map(s => s.subcategoryId);
      
      // IDs das subcategorias existentes
      const existingSubcategoryIds = existingSubcategories.map(s => s.subcategoryId);

      // Remover subcategorias que não estão mais na lista
      const toRemove = existingSubcategoryIds.filter(id => !incomingSubcategoryIds.includes(id));
      if (toRemove.length > 0) {
        await fastify.prisma.professionalSubcategory.deleteMany({
          where: {
            professionalId,
            subcategoryId: { in: toRemove },
          },
        });
      }

      // Upsert (criar ou atualizar) cada subcategoria
      for (const sub of subcategories) {
        await fastify.prisma.professionalSubcategory.upsert({
          where: {
            professionalId_subcategoryId: {
              professionalId,
              subcategoryId: sub.subcategoryId,
            },
          },
          update: {
            price: sub.price,
            isActive: sub.isActive ?? true,
          },
          create: {
            professionalId,
            subcategoryId: sub.subcategoryId,
            price: sub.price,
            isActive: sub.isActive ?? true,
          },
        });
      }

      // Buscar subcategorias atualizadas para retornar
      const updatedSubcategories = await fastify.prisma.professionalSubcategory.findMany({
        where: { professionalId },
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
      });

      return {
        message: 'Services updated successfully',
        subcategories: updatedSubcategories,
      };
    }
  );
};

export default professionalRoute;

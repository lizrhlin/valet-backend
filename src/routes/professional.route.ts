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

      // Se available for undefined, não filtrar por disponibilidade
      // (mostra todos, incluindo null que serão tratados como disponíveis)
      // Se available=true, mostrar apenas os com agenda aberta
      // Se available=false, mostrar apenas os com agenda fechada
      if (available === true) {
        where.available = true;
      } else if (available === false) {
        where.available = false;
      }
      // Se available === undefined, não adiciona nenhum filtro
      // (backend considera null como disponível por padrão)

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

  // Buscar disponibilidade customizada (por data específica)
  fastify.get<{
    Params: { professionalId: string };
    Querystring: { startDate?: string; endDate?: string };
  }>(
    '/professionals/:professionalId/custom-availability',
    {
      schema: {
        tags: ['professionals'],
        description: 'Get professional custom availability by date',
        params: professionalIdParamSchema,
        querystring: z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { professionalId } = request.params;
      const { startDate, endDate } = request.query;

      const where: any = { professionalId };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      const customAvailability = await fastify.prisma.customAvailability.findMany({
        where,
        orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
      });

      return { customAvailability };
    }
  );

  // Salvar disponibilidade customizada (por data específica)
  fastify.put<{
    Params: { professionalId: string };
    Body: {
      schedules: Array<{
        date: string;
        timeSlots: string[];
      }>;
    };
  }>(
    '/professionals/:professionalId/custom-availability',
    {
      schema: {
        tags: ['professionals'],
        description: 'Update professional custom availability',
        params: professionalIdParamSchema,
        body: z.object({
          schedules: z.array(z.object({
            date: z.string(),
            timeSlots: z.array(z.string()),
          })),
        }),
      },
    },
    async (request, reply) => {
      const { professionalId } = request.params;
      const { schedules } = request.body;

      // Verificar se profissional existe
      const professional = await fastify.prisma.user.findUnique({
        where: { id: professionalId },
      });

      if (!professional || professional.userType !== 'PROFESSIONAL') {
        reply.code(404);
        return { error: 'Professional not found' };
      }

      // DELETAR TODAS as disponibilidades antigas do profissional
      await fastify.prisma.customAvailability.deleteMany({
        where: { professionalId },
      });

      // Criar novas disponibilidades
      const customAvailabilityData = schedules.flatMap(schedule => {
        // Garantir que a data seja interpretada como UTC meio-dia para evitar problemas de timezone
        const [year, month, day] = schedule.date.split('-').map(Number);
        const dateUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        
        return schedule.timeSlots.map(timeSlot => ({
          professionalId,
          date: dateUTC,
          timeSlot,
          isAvailable: true,
        }));
      });

      if (customAvailabilityData.length > 0) {
        await fastify.prisma.customAvailability.createMany({
          data: customAvailabilityData,
        });
      }

      // Verificar se realmente salvou
      const saved = await fastify.prisma.customAvailability.findMany({
        where: { professionalId },
        orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
      });

      return {
        message: 'Custom availability updated successfully',
        count: customAvailabilityData.length,
        savedCount: saved.length,
      };
    }
  );

  // Atualizar status de disponibilidade (agenda aberta/fechada)
  fastify.patch<{
    Params: { professionalId: string };
    Body: { available: boolean };
  }>(
    '/professionals/:professionalId',
    {
      schema: {
        tags: ['professionals'],
        description: 'Update professional availability status',
        params: professionalIdParamSchema,
        body: z.object({
          available: z.boolean(),
        }),
        response: {
          200: z.object({
            message: z.string(),
            available: z.boolean(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { professionalId } = request.params;
      const { available } = request.body;

      // Verificar se profissional existe
      const professional = await fastify.prisma.user.findUnique({
        where: { id: professionalId },
      });

      if (!professional || professional.userType !== 'PROFESSIONAL') {
        reply.code(404);
        return { error: 'Professional not found' };
      }

      // Atualizar status
      await fastify.prisma.user.update({
        where: { id: professionalId },
        data: { available },
      });

      return {
        message: 'Availability status updated successfully',
        available,
      };
    }
  );
};

export default professionalRoute;

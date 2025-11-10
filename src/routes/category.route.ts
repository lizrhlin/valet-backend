import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  getCategoriesQuerySchema,
  getSubcategoriesQuerySchema,
  categoryIdParamSchema,
  subcategoryIdParamSchema,
  categoryResponseSchema,
  subcategoryResponseSchema,
  categoryWithSubcategoriesResponseSchema,
} from '../schemas/category.schema.js';

const categoryRoute: FastifyPluginAsync = async (fastify) => {
  // Listar todas as categorias
  fastify.get(
    '/categories',
    {
      schema: {
        tags: ['categories'],
        description: 'List all categories',
        querystring: getCategoriesQuerySchema,
        response: {
          200: z.object({
            categories: z.array(categoryResponseSchema),
            total: z.number(),
          }),
        },
      },
    },
    async (request) => {
      const { isActive } = request.query as { isActive?: boolean };

      const where = isActive !== undefined ? { isActive } : {};

      const [categories, total] = await Promise.all([
        fastify.prisma.category.findMany({
          where,
          orderBy: { order: 'asc' },
        }),
        fastify.prisma.category.count({ where }),
      ]);

      return {
        categories: categories.map(cat => ({
          ...cat,
          createdAt: cat.createdAt.toISOString(),
          updatedAt: cat.updatedAt.toISOString(),
        })),
        total,
      };
    }
  );

  // Buscar categoria por ID
  fastify.get<{
    Params: { categoryId: string };
  }>(
    '/categories/:categoryId',
    {
      schema: {
        tags: ['categories'],
        description: 'Get category by ID',
        params: categoryIdParamSchema,
        response: {
          200: categoryResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { categoryId } = request.params;

      const category = await fastify.prisma.category.findUnique({
        where: { id: parseInt(categoryId) },
      });

      if (!category) {
        reply.code(404);
        return { error: 'Category not found' };
      }

      return {
        ...category,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      };
    }
  );

  // Buscar categoria com subcategorias
  fastify.get<{
    Params: { categoryId: string };
  }>(
    '/categories/:categoryId/subcategories',
    {
      schema: {
        tags: ['categories'],
        description: 'Get category with subcategories',
        params: categoryIdParamSchema,
        response: {
          200: categoryWithSubcategoriesResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { categoryId } = request.params;

      const category = await fastify.prisma.category.findUnique({
        where: { id: parseInt(categoryId) },
        include: {
          subcategories: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!category) {
        reply.code(404);
        return { error: 'Category not found' };
      }

      return {
        ...category,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
        subcategories: category.subcategories.map(sub => ({
          ...sub,
          createdAt: sub.createdAt.toISOString(),
          updatedAt: sub.updatedAt.toISOString(),
        })),
      };
    }
  );

  // Listar todas as subcategorias
  fastify.get(
    '/subcategories',
    {
      schema: {
        tags: ['subcategories'],
        description: 'List all subcategories',
        querystring: getSubcategoriesQuerySchema,
        response: {
          200: z.object({
            subcategories: z.array(subcategoryResponseSchema),
            total: z.number(),
          }),
        },
      },
    },
    async (request) => {
      const { categoryId, isActive } = request.query as { categoryId?: number; isActive?: boolean };

      const where: any = {};
      if (categoryId) where.categoryId = categoryId;
      if (isActive !== undefined) where.isActive = isActive;

      const [subcategories, total] = await Promise.all([
        fastify.prisma.subcategory.findMany({
          where,
          orderBy: [{ categoryId: 'asc' }, { order: 'asc' }],
        }),
        fastify.prisma.subcategory.count({ where }),
      ]);

      return {
        subcategories: subcategories.map(sub => ({
          ...sub,
          createdAt: sub.createdAt.toISOString(),
          updatedAt: sub.updatedAt.toISOString(),
        })),
        total,
      };
    }
  );

  // Buscar subcategoria por ID
  fastify.get<{
    Params: { subcategoryId: string };
  }>(
    '/subcategories/:subcategoryId',
    {
      schema: {
        tags: ['subcategories'],
        description: 'Get subcategory by ID',
        params: subcategoryIdParamSchema,
        response: {
          200: subcategoryResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { subcategoryId } = request.params;

      const subcategory = await fastify.prisma.subcategory.findUnique({
        where: { id: parseInt(subcategoryId) },
      });

      if (!subcategory) {
        reply.code(404);
        return { error: 'Subcategory not found' };
      }

      return {
        ...subcategory,
        createdAt: subcategory.createdAt.toISOString(),
        updatedAt: subcategory.updatedAt.toISOString(),
      };
    }
  );
};

export default categoryRoute;

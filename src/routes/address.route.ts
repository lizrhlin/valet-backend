import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
  addressResponseSchema,
} from '../schemas/address.schema.js';
import { authenticate } from '../utils/auth.js';

const addressRoute: FastifyPluginAsync = async (fastify) => {
  // Todas as rotas de endereço requerem autenticação
  fastify.addHook('onRequest', authenticate);

  // Listar endereços do usuário
  fastify.get(
    '/addresses',
    {
      schema: {
        tags: ['addresses'],
        description: 'List user addresses',
        response: {
          200: z.array(addressResponseSchema),
        },
      },
    },
    async (request) => {
      const userId = request.user.userId;

      const addresses = await fastify.prisma.address.findMany({
        where: { userId },
        orderBy: [
          { isDefault: 'desc' }, // Default primeiro
          { createdAt: 'desc' },
        ],
      });

      return addresses.map(addr => ({
        ...addr,
        createdAt: addr.createdAt.toISOString(),
        updatedAt: addr.updatedAt.toISOString(),
      }));
    }
  );

  // Buscar endereço padrão do usuário
  fastify.get(
    '/addresses/default',
    {
      schema: {
        tags: ['addresses'],
        description: 'Get user default address',
        response: {
          200: addressResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;

      const address = await fastify.prisma.address.findFirst({
        where: { userId, isDefault: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!address) {
        reply.code(404);
        return { error: 'No default address found' };
      }

      return {
        ...address,
        createdAt: address.createdAt.toISOString(),
        updatedAt: address.updatedAt.toISOString(),
      };
    }
  );

  // Buscar endereço por ID
  fastify.get<{ Params: { addressId: string } }>(
    '/addresses/:addressId',
    {
      schema: {
        tags: ['addresses'],
        description: 'Get address by ID',
        params: addressIdParamSchema,
        response: {
          200: addressResponseSchema,
          403: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { addressId } = request.params;

      const address = await fastify.prisma.address.findUnique({
        where: { id: addressId },
      });

      if (!address) {
        reply.code(404);
        return { error: 'Address not found' };
      }

      if (address.userId !== userId) {
        reply.code(403);
        return { error: 'Access denied' };
      }

      return {
        ...address,
        createdAt: address.createdAt.toISOString(),
        updatedAt: address.updatedAt.toISOString(),
      };
    }
  );

  // Criar novo endereço
  fastify.post(
    '/addresses',
    {
      schema: {
        tags: ['addresses'],
        description: 'Create new address',
        body: createAddressSchema,
        response: {
          201: addressResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const data = request.body as z.infer<typeof createAddressSchema>;

      // Se este for marcado como default, desmarcar outros
      if (data.isDefault) {
        await fastify.prisma.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const address = await fastify.prisma.address.create({
        data: {
          userId,
          ...data,
        },
      });

      reply.code(201);
      return {
        ...address,
        createdAt: address.createdAt.toISOString(),
        updatedAt: address.updatedAt.toISOString(),
      };
    }
  );

  // Atualizar endereço
  fastify.put<{ Params: { addressId: string } }>(
    '/addresses/:addressId',
    {
      schema: {
        tags: ['addresses'],
        description: 'Update address',
        params: addressIdParamSchema,
        body: updateAddressSchema,
        response: {
          200: addressResponseSchema,
          403: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { addressId } = request.params;
      const data = request.body as z.infer<typeof updateAddressSchema>;

      const address = await fastify.prisma.address.findUnique({
        where: { id: addressId },
      });

      if (!address) {
        reply.code(404);
        return { error: 'Address not found' };
      }

      if (address.userId !== userId) {
        reply.code(403);
        return { error: 'Access denied' };
      }

      // Se marcando como default, desmarcar outros
      if (data.isDefault) {
        await fastify.prisma.address.updateMany({
          where: { userId, isDefault: true, NOT: { id: addressId } },
          data: { isDefault: false },
        });
      }

      const updated = await fastify.prisma.address.update({
        where: { id: addressId },
        data,
      });

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }
  );

  // Deletar endereço
  fastify.delete<{ Params: { addressId: string } }>(
    '/addresses/:addressId',
    {
      schema: {
        tags: ['addresses'],
        description: 'Delete address',
        params: addressIdParamSchema,
        response: {
          200: z.object({ message: z.string() }),
          403: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { addressId } = request.params;

      const address = await fastify.prisma.address.findUnique({
        where: { id: addressId },
      });

      if (!address) {
        reply.code(404);
        return { error: 'Address not found' };
      }

      if (address.userId !== userId) {
        reply.code(403);
        return { error: 'Access denied' };
      }

      await fastify.prisma.address.delete({
        where: { id: addressId },
      });

      return { message: 'Address deleted successfully' };
    }
  );

  // Marcar endereço como padrão
  fastify.patch<{ Params: { addressId: string } }>(
    '/addresses/:addressId/set-default',
    {
      schema: {
        tags: ['addresses'],
        description: 'Set address as default',
        params: addressIdParamSchema,
        response: {
          200: addressResponseSchema,
          403: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { addressId } = request.params;

      const address = await fastify.prisma.address.findUnique({
        where: { id: addressId },
      });

      if (!address) {
        reply.code(404);
        return { error: 'Address not found' };
      }

      if (address.userId !== userId) {
        reply.code(403);
        return { error: 'Access denied' };
      }

      // Desmarcar outros endereços como padrão
      await fastify.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      // Marcar este como padrão
      const updated = await fastify.prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }
  );
};

export default addressRoute;

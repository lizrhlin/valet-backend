import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../utils/auth.js';

const favoriteRoute: FastifyPluginAsync = async (fastify) => {
  // Todas as rotas requerem autenticação
  fastify.addHook('onRequest', authenticate);

  // Listar favoritos do usuário
  fastify.get(
    '/favorites',
    {
      schema: {
        tags: ['favorites'],
        description: 'List user favorites',
      },
    },
    async (request) => {
      const userId = request.user.userId;

      const favorites = await fastify.prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      // Buscar dados dos profissionais
      const professionals = await Promise.all(
        favorites.map(async (fav) => {
          const professional = await fastify.prisma.professional.findUnique({
            where: { id: fav.professionalId },
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
                include: {
                  subcategory: {
                    include: {
                      category: true,
                    },
                  },
                },
              },
            },
          });

          return {
            favoriteId: fav.id,
            createdAt: fav.createdAt.toISOString(),
            professional,
          };
        })
      );

      return professionals.filter(p => p.professional !== null);
    }
  );

  // Verificar se profissional está nos favoritos
  fastify.get<{ Params: { professionalId: string } }>(
    '/favorites/check/:professionalId',
    {
      schema: {
        tags: ['favorites'],
        description: 'Check if professional is favorited',
        params: z.object({ professionalId: z.string() }),
      },
    },
    async (request) => {
      const userId = request.user.userId;
      const { professionalId } = request.params;

      const favorite = await fastify.prisma.favorite.findUnique({
        where: {
          userId_professionalId: {
            userId,
            professionalId,
          },
        },
      });

      return { isFavorite: !!favorite };
    }
  );

  // Adicionar favorito
  fastify.post(
    '/favorites',
    {
      schema: {
        tags: ['favorites'],
        description: 'Add favorite',
        body: z.object({ professionalId: z.string() }),
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { professionalId } = request.body as { professionalId: string };

      // Verificar se profissional existe (buscar em User com userType PROFESSIONAL)
      const professional = await fastify.prisma.user.findFirst({
        where: { 
          id: professionalId,
          userType: 'PROFESSIONAL'
        },
      });

      if (!professional) {
        reply.code(404);
        return { error: 'Professional not found' };
      }

      // Verificar se já existe
      const existing = await fastify.prisma.favorite.findUnique({
        where: {
          userId_professionalId: {
            userId,
            professionalId,
          },
        },
      });

      if (existing) {
        reply.code(400);
        return { error: 'Already favorited' };
      }

      const favorite = await fastify.prisma.favorite.create({
        data: {
          userId,
          professionalId,
        },
      });

      reply.code(201);
      return {
        ...favorite,
        createdAt: favorite.createdAt.toISOString(),
      };
    }
  );

  // Remover favorito
  fastify.delete<{ Params: { professionalId: string } }>(
    '/favorites/:professionalId',
    {
      schema: {
        tags: ['favorites'],
        description: 'Remove favorite',
        params: z.object({ professionalId: z.string() }),
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { professionalId } = request.params;

      const favorite = await fastify.prisma.favorite.findUnique({
        where: {
          userId_professionalId: {
            userId,
            professionalId,
          },
        },
      });

      if (!favorite) {
        reply.code(404);
        return { error: 'Favorite not found' };
      }

      await fastify.prisma.favorite.delete({
        where: {
          userId_professionalId: {
            userId,
            professionalId,
          },
        },
      });

      return { message: 'Favorite removed successfully' };
    }
  );

  // Toggle favorito
  fastify.post(
    '/favorites/toggle',
    {
      schema: {
        tags: ['favorites'],
        description: 'Toggle favorite',
        body: z.object({ professionalId: z.string() }),
      },
    },
    async (request) => {
      const userId = request.user.userId;
      const { professionalId } = request.body as { professionalId: string };

      const existing = await fastify.prisma.favorite.findUnique({
        where: {
          userId_professionalId: {
            userId,
            professionalId,
          },
        },
      });

      if (existing) {
        // Remover
        await fastify.prisma.favorite.delete({
          where: {
            userId_professionalId: {
              userId,
              professionalId,
            },
          },
        });
        return { isFavorite: false, message: 'Removed from favorites' };
      } else {
        // Adicionar
        await fastify.prisma.favorite.create({
          data: {
            userId,
            professionalId,
          },
        });
        return { isFavorite: true, message: 'Added to favorites' };
      }
    }
  );

  // Limpar todos os favoritos
  fastify.delete(
    '/favorites/all',
    {
      schema: {
        tags: ['favorites'],
        description: 'Clear all favorites',
      },
    },
    async (request) => {
      const userId = request.user.userId;

      const result = await fastify.prisma.favorite.deleteMany({
        where: { userId },
      });

      return { message: `Cleared ${result.count} favorites` };
    }
  );
};

export default favoriteRoute;

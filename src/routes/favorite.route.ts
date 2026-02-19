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
        description: 'List user favorites with full professional data',
      },
    },
    async (request) => {
      const userId = request.user.userId;

      const favorites = await fastify.prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          professional: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              createdAt: true,
              updatedAt: true,
              professionalProfile: {
                include: {
                  primaryCategory: { select: { id: true, name: true } },
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
                      imageUrl: true,
                      categoryId: true,
                      category: {
                        select: { id: true, name: true, slug: true },
                      },
                    },
                  },
                },
              },
              addresses: {
                where: { isDefault: true },
                select: {
                  city: true,
                  state: true,
                  neighborhood: true,
                },
                take: 1,
              },
            },
          },
        },
      });

      return favorites
        .filter(fav => fav.professional !== null)
        .map(fav => {
          const prof = fav.professional;
          const defaultAddress = prof.addresses?.[0];
          const locationParts = [defaultAddress?.neighborhood, defaultAddress?.city, defaultAddress?.state].filter(Boolean);
          return {
            favoriteId: fav.id,
            createdAt: fav.createdAt.toISOString(),
            professional: {
              id: prof.id,
              name: prof.name,
              email: prof.email,
              phone: prof.phone,
              avatar: prof.avatar,
              specialty: prof.professionalProfile?.primaryCategory?.name || null,
              experience: prof.professionalProfile?.experienceRange || null,
              servicesCompleted: prof.professionalProfile?.servicesCompleted ?? 0,
              available: prof.professionalProfile?.isAvailable ?? false,
              isVerified: prof.professionalProfile?.isVerified ?? false,
              rating: prof.professionalProfile?.ratingAvg ?? 0,
              reviewCount: prof.professionalProfile?.reviewCount ?? 0,
              location: locationParts.length > 0 ? locationParts.join(', ') : null,
              latitude: prof.professionalProfile?.latitude ?? null,
              longitude: prof.professionalProfile?.longitude ?? null,
              subcategories: prof.subcategories,
              createdAt: prof.createdAt.toISOString(),
              updatedAt: prof.updatedAt.toISOString(),
            },
          };
        });
    }
  );

  // Adicionar favorito
  fastify.post(
    '/favorites',
    {
      schema: {
        tags: ['favorites'],
        description: 'Add a professional to favorites',
        body: z.object({ professionalId: z.string() }),
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { professionalId } = request.body as { professionalId: string };

      // Verificar se profissional existe
      const professional = await fastify.prisma.user.findFirst({
        where: { id: professionalId, userType: 'PROFESSIONAL' },
      });

      if (!professional) {
        reply.code(404);
        return { error: 'Professional not found' };
      }

      // Usar upsert para evitar race condition (idempotente)
      const favorite = await fastify.prisma.favorite.upsert({
        where: {
          userId_professionalId: { userId, professionalId },
        },
        update: {}, // já existe, não faz nada
        create: { userId, professionalId },
      });

      reply.code(201);
      return {
        id: favorite.id,
        professionalId: favorite.professionalId,
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
        description: 'Remove a professional from favorites',
        params: z.object({ professionalId: z.string() }),
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { professionalId } = request.params;

      const deleted = await fastify.prisma.favorite.deleteMany({
        where: { userId, professionalId },
      });

      if (deleted.count === 0) {
        reply.code(404);
        return { error: 'Favorite not found' };
      }

      return { message: 'Favorite removed successfully' };
    }
  );
};

export default favoriteRoute;

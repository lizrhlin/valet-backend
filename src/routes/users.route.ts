import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { userResponseSchema, updateProfileSchema, updatePreferencesSchema, UpdateProfileInput } from '../schemas/user.schema.js';
import { authenticate } from '../utils/auth.js';

const usersRoute: FastifyPluginAsync = async (fastify) => {
  // Get current user (authenticated)
  fastify.get(
    '/me',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['users'],
        description: 'Get current authenticated user',
        security: [{ bearerAuth: [] }],
        response: {
          200: userResponseSchema,
          401: z.object({
            error: z.string(),
          }),
          404: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        include: { 
          professionalProfile: true,
          documents: {
            select: {
              id: true,
              type: true,
              url: true,
              status: true,
              rejectionReason: true,
              reviewedAt: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!user) {
        reply.code(404);
        return { error: 'User not found' };
      }

      // Reconciliação automática do status de verificação com base nos documentos
      let reconciledProfile = user.professionalProfile;
      if (
        user.userType === 'PROFESSIONAL' &&
        reconciledProfile
      ) {
        const hasIdDoc = user.documents.some(d => d.type === 'ID_DOCUMENT' && d.status === 'APPROVED');
        const hasSelfie = user.documents.some(d => d.type === 'SELFIE_WITH_DOCUMENT' && d.status === 'APPROVED');
        const hasRejectedDoc = user.documents.some(d =>
          (d.type === 'ID_DOCUMENT' || d.type === 'SELFIE_WITH_DOCUMENT') && d.status === 'REJECTED'
        );

        if (hasIdDoc && hasSelfie && !reconciledProfile.isVerified) {
          // Todos aprovados → auto-aprovar perfil
          reconciledProfile = await fastify.prisma.professionalProfile.update({
            where: { userId: user.id },
            data: {
              isVerified: true,
              onboardingStatus: 'VERIFIED',
            },
          });
        } else if (hasRejectedDoc && reconciledProfile.onboardingStatus !== 'REJECTED') {
          // Algum documento rejeitado → marcar perfil como rejeitado
          reconciledProfile = await fastify.prisma.professionalProfile.update({
            where: { userId: user.id },
            data: {
              isVerified: false,
              onboardingStatus: 'REJECTED',
            },
          });
        }
      }

      // Remove password from response
      const { passwordHash, refreshTokenHash, resetPasswordToken, resetPasswordExpires, ...userWithoutSensitiveData } = user;
      
      return {
        ...userWithoutSensitiveData,
        // Campos de verificação achatados para facilitar no frontend
        isVerified: reconciledProfile?.isVerified ?? false,
        onboardingStatus: reconciledProfile?.onboardingStatus ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    }
  );

  // Update current user
  fastify.patch<{
    Body: UpdateProfileInput;
  }>(
    '/me',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['users'],
        description: 'Update current authenticated user',
        security: [{ bearerAuth: [] }],
        body: updateProfileSchema,
        response: {
          200: userResponseSchema,
          400: z.object({
            error: z.string(),
          }),
          401: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;

      try {
        // Validar unicidade de email por userType
        if (request.body.email) {
          const currentUser = await fastify.prisma.user.findUnique({ where: { id: userId }, select: { userType: true } });
          if (currentUser) {
            const emailConflict = await fastify.prisma.user.findFirst({
              where: {
                email: request.body.email.toLowerCase().trim(),
                userType: currentUser.userType,
                id: { not: userId },
              },
            });
            if (emailConflict) {
              const label = currentUser.userType === 'CLIENT' ? 'cliente' : 'profissional';
              reply.code(400);
              return { error: `Este email já está cadastrado como ${label}.` };
            }
          }
        }

        const updatedUser = await fastify.prisma.user.update({
          where: { id: userId },
          data: request.body,
          include: { 
            professionalProfile: true,
            documents: {
              select: {
                id: true,
                type: true,
                url: true,
                status: true,
                rejectionReason: true,
                reviewedAt: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        // Remove password from response
        const { passwordHash, refreshTokenHash, resetPasswordToken, resetPasswordExpires, ...userWithoutSensitiveData } = updatedUser;
        
        return {
          ...userWithoutSensitiveData,
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString(),
        };
      } catch (error) {
        reply.code(400);
        return { error: error instanceof Error ? error.message : 'Update failed' };
      }
    }
  );

  // Update user preferences (notifications, language)
  fastify.patch(
    '/me/preferences',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['users'],
        description: 'Update user preferences (notifications, language)',
        security: [{ bearerAuth: [] }],
        body: updatePreferencesSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const data = request.body as z.infer<typeof updatePreferencesSchema>;

      try {
        const updatedUser = await fastify.prisma.user.update({
          where: { id: userId },
          data,
          select: {
            id: true,
            notificationsEnabled: true,
            language: true,
          },
        });

        return updatedUser;
      } catch (error) {
        reply.code(400);
        return { error: error instanceof Error ? error.message : 'Erro ao atualizar preferências' };
      }
    }
  );

  // Get user preferences
  fastify.get(
    '/me/preferences',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['users'],
        description: 'Get user preferences',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const userId = request.user.userId;

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          notificationsEnabled: true,
          language: true,
        },
      });

      return user || { notificationsEnabled: true, language: 'pt-BR' };
    }
  );

  // Excluir conta do usuário
  fastify.delete<{
    Body: { password: string; reason?: string };
  }>(
    '/me',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['users'],
        description: 'Delete current user account',
        security: [{ bearerAuth: [] }],
        body: z.object({
          password: z.string().min(1, 'Senha é obrigatória'),
          reason: z.string().optional(),
        }),
        response: {
          200: z.object({ message: z.string() }),
          400: z.object({ message: z.string() }),
          409: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { password, reason } = request.body;

      try {
        // 1. Buscar usuário e verificar senha
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, passwordHash: true, userType: true },
        });

        if (!user) {
          reply.code(400);
          return { message: 'Usuário não encontrado' };
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
          reply.code(400);
          return { message: 'Senha incorreta' };
        }

        // 2. Verificar se há agendamentos ativos
        const activeAppointments = await fastify.prisma.appointment.findFirst({
          where: {
            OR: [
              { clientId: userId },
              { professionalId: userId },
            ],
            status: { in: ['PENDING', 'CONFIRMED', 'ON_WAY', 'IN_PROGRESS'] },
          },
        });

        if (activeAppointments) {
          reply.code(409);
          return {
            message: 'Você possui serviços ativos ou agendamentos em andamento. Finalize ou cancele todos antes de excluir sua conta.',
          };
        }

        // 3. Log do motivo (se fornecido)
        if (reason) {
          fastify.log.info({ userId, reason }, 'Account deletion reason');
        }

        // 4. Deletar dados relacionados e conta em transação
        await fastify.prisma.$transaction(async (tx) => {
          // Deletar notificações
          await tx.notification.deleteMany({ where: { userId } });

          // Deletar favoritos (como favoritor e como favoritado)
          await tx.favorite.deleteMany({ where: { OR: [{ userId }, { professionalId: userId }] } });

          // Deletar reviews (depende de appointments)
          await tx.review.deleteMany({ where: { OR: [{ fromUserId: userId }, { toUserId: userId }] } });

          // Deletar agendamentos (depende de endereços, subcategorias)
          await tx.appointment.deleteMany({
            where: { OR: [{ clientId: userId }, { professionalId: userId }] },
          });

          // Deletar disponibilidade customizada
          await tx.customAvailability.deleteMany({ where: { professionalId: userId } });

          // Deletar documentos
          await tx.userDocument.deleteMany({ where: { userId } });

          // Deletar endereços (após appointments que os referenciam)
          await tx.address.deleteMany({ where: { userId } });

          // Deletar subcategorias e categorias associadas
          await tx.professionalSubcategory.deleteMany({ where: { professionalId: userId } });
          await tx.professionalCategory.deleteMany({ where: { professionalId: userId } });

          // Deletar perfil profissional
          await tx.professionalProfile.deleteMany({ where: { userId } });

          // Deletar o usuário
          await tx.user.delete({ where: { id: userId } });
        });

        return { message: 'Conta excluída com sucesso' };
      } catch (error) {
        fastify.log.error(error, 'Error deleting account');
        reply.code(400);
        return { message: 'Erro ao excluir conta. Tente novamente.' };
      }
    }
  );
};

export default usersRoute;

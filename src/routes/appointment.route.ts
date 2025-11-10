import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  createAppointmentSchema,
  getAppointmentsQuerySchema,
  appointmentIdParamSchema,
} from '../schemas/appointment.schema.js';
import { authenticate } from '../utils/auth.js';

const appointmentRoute: FastifyPluginAsync = async (fastify) => {
  // Todas as rotas de agendamento requerem autenticação
  fastify.addHook('onRequest', authenticate);

  // Criar novo agendamento
  fastify.post(
    '/appointments',
    {
      schema: {
        tags: ['appointments'],
        description: 'Create a new appointment',
        body: createAppointmentSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const data = request.body as z.infer<typeof createAppointmentSchema>;

      // Verificar se o profissional existe
      const professionalProfile = await fastify.prisma.professional.findUnique({
        where: { id: data.professionalId },
        include: {
          subcategories: {
            where: { subcategoryId: parseInt(data.subcategoryId) },
          },
        },
      });

      if (!professionalProfile) {
        reply.code(404);
        return { error: 'Professional not found' };
      }

      // Verificar se oferece esse serviço
      if (professionalProfile.subcategories.length === 0) {
        reply.code(400);
        return { error: 'Professional does not offer this service' };
      }

      const servicePrice = professionalProfile.subcategories[0];

      // Verificar endereço
      const address = await fastify.prisma.address.findFirst({
        where: { id: data.addressId, userId },
      });

      if (!address) {
        reply.code(404);
        return { error: 'Address not found' };
      }

      // Gerar número único
      const orderNumber = `LIZ${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Criar agendamento
      const appointment = await fastify.prisma.appointment.create({
        data: {
          orderNumber,
          clientId: userId,
          professionalId: professionalProfile.userId,
          subcategoryId: parseInt(data.subcategoryId),
          addressId: data.addressId,
          scheduledDate: new Date(data.scheduledDate),
          scheduledTime: data.scheduledTime,
          status: 'PENDING',
          price: servicePrice.price,
          estimatedDuration: 60, // Default
          notes: data.notes,
        },
        include: {
          client: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          professional: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          subcategory: { include: { category: true } },
          address: true,
        },
      });

      reply.code(201);
      return {
        ...appointment,
        createdAt: appointment.createdAt.toISOString(),
        updatedAt: appointment.updatedAt.toISOString(),
        scheduledDate: appointment.scheduledDate.toISOString(),
        confirmedAt: appointment.confirmedAt?.toISOString() || null,
        startedAt: appointment.startedAt?.toISOString() || null,
        completedAt: appointment.completedAt?.toISOString() || null,
        cancelledAt: appointment.cancelledAt?.toISOString() || null,
      };
    }
  );

  // Listar agendamentos
  fastify.get(
    '/appointments',
    {
      schema: {
        tags: ['appointments'],
        description: 'List user appointments',
        querystring: getAppointmentsQuerySchema,
      },
    },
    async (request) => {
      const userId = request.user.userId;
      const { status, page = 1, limit = 20 } = request.query as z.infer<typeof getAppointmentsQuerySchema>;

      const where: any = {
        OR: [
          { clientId: userId },
          { professionalId: userId },
        ],
      };

      if (status) {
        where.status = status;
      }

      const skip = (page - 1) * limit;

      const [appointments, total] = await Promise.all([
        fastify.prisma.appointment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { scheduledDate: 'desc' },
          include: {
            client: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
            professional: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
            subcategory: { include: { category: true } },
            address: true,
          },
        }),
        fastify.prisma.appointment.count({ where }),
      ]);

      return {
        data: appointments.map(apt => ({
          ...apt,
          createdAt: apt.createdAt.toISOString(),
          updatedAt: apt.updatedAt.toISOString(),
          scheduledDate: apt.scheduledDate.toISOString(),
          confirmedAt: apt.confirmedAt?.toISOString() || null,
          startedAt: apt.startedAt?.toISOString() || null,
          completedAt: apt.completedAt?.toISOString() || null,
          cancelledAt: apt.cancelledAt?.toISOString() || null,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
  );

  // Buscar agendamento por ID
  fastify.get<{ Params: { appointmentId: string } }>(
    '/appointments/:appointmentId',
    {
      schema: {
        tags: ['appointments'],
        description: 'Get appointment by ID',
        params: appointmentIdParamSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { appointmentId } = request.params;

      const appointment = await fastify.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          client: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          professional: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          subcategory: { include: { category: true } },
          address: true,
        },
      });

      if (!appointment) {
        reply.code(404);
        return { error: 'Appointment not found' };
      }

      // Verificar acesso
      if (appointment.clientId !== userId && appointment.professionalId !== userId) {
        reply.code(403);
        return { error: 'Access denied' };
      }

      return {
        ...appointment,
        createdAt: appointment.createdAt.toISOString(),
        updatedAt: appointment.updatedAt.toISOString(),
        scheduledDate: appointment.scheduledDate.toISOString(),
        confirmedAt: appointment.confirmedAt?.toISOString() || null,
        startedAt: appointment.startedAt?.toISOString() || null,
        completedAt: appointment.completedAt?.toISOString() || null,
        cancelledAt: appointment.cancelledAt?.toISOString() || null,
      };
    }
  );

  // Cancelar agendamento
  fastify.patch<{ Params: { appointmentId: string } }>(
    '/appointments/:appointmentId/cancel',
    {
      schema: {
        tags: ['appointments'],
        description: 'Cancel appointment',
        params: appointmentIdParamSchema,
        body: z.object({ reason: z.string().max(500).optional() }),
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { appointmentId } = request.params;
      const { reason } = request.body as { reason?: string };

      const appointment = await fastify.prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        reply.code(404);
        return { error: 'Appointment not found' };
      }

      // Cliente ou profissional podem cancelar
      if (appointment.clientId !== userId && appointment.professionalId !== userId) {
        reply.code(403);
        return { error: 'Access denied' };
      }

      if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED') {
        reply.code(400);
        return { error: 'Cannot cancel this appointment' };
      }

      const updated = await fastify.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
        include: {
          client: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          professional: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          subcategory: { include: { category: true } },
          address: true,
        },
      });

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        scheduledDate: updated.scheduledDate.toISOString(),
        confirmedAt: updated.confirmedAt?.toISOString() || null,
        startedAt: updated.startedAt?.toISOString() || null,
        completedAt: updated.completedAt?.toISOString() || null,
        cancelledAt: updated.cancelledAt?.toISOString() || null,
      };
    }
  );

  // Confirmar agendamento (profissional)
  fastify.patch<{ Params: { appointmentId: string } }>(
    '/appointments/:appointmentId/confirm',
    {
      schema: {
        tags: ['appointments'],
        description: 'Confirm appointment (professional only)',
        params: appointmentIdParamSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { appointmentId } = request.params;

      const appointment = await fastify.prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        reply.code(404);
        return { error: 'Appointment not found' };
      }

      if (appointment.professionalId !== userId) {
        reply.code(403);
        return { error: 'Only the professional can confirm' };
      }

      if (appointment.status !== 'PENDING') {
        reply.code(400);
        return { error: 'Only pending appointments can be confirmed' };
      }

      const updated = await fastify.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
        include: {
          client: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          professional: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          subcategory: { include: { category: true } },
          address: true,
        },
      });

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        scheduledDate: updated.scheduledDate.toISOString(),
        confirmedAt: updated.confirmedAt?.toISOString() || null,
        startedAt: updated.startedAt?.toISOString() || null,
        completedAt: updated.completedAt?.toISOString() || null,
        cancelledAt: updated.cancelledAt?.toISOString() || null,
      };
    }
  );

  // Completar agendamento (profissional)
  fastify.patch<{ Params: { appointmentId: string } }>(
    '/appointments/:appointmentId/complete',
    {
      schema: {
        tags: ['appointments'],
        description: 'Complete service (professional only)',
        params: appointmentIdParamSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { appointmentId } = request.params;

      const appointment = await fastify.prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        reply.code(404);
        return { error: 'Appointment not found' };
      }

      if (appointment.professionalId !== userId) {
        reply.code(403);
        return { error: 'Only the professional can complete' };
      }

      if (appointment.status !== 'IN_PROGRESS') {
        reply.code(400);
        return { error: 'Only in-progress appointments can be completed' };
      }

      const updated = await fastify.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
        include: {
          client: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          professional: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
          subcategory: { include: { category: true } },
          address: true,
        },
      });

      // Incrementar contador do profissional
      await fastify.prisma.professional.update({
        where: { userId: appointment.professionalId },
        data: { servicesCompleted: { increment: 1 } },
      });

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        scheduledDate: updated.scheduledDate.toISOString(),
        confirmedAt: updated.confirmedAt?.toISOString() || null,
        startedAt: updated.startedAt?.toISOString() || null,
        completedAt: updated.completedAt?.toISOString() || null,
        cancelledAt: updated.cancelledAt?.toISOString() || null,
      };
    }
  );
};

export default appointmentRoute;

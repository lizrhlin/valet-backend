import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  createAppointmentSchema,
  getAppointmentsQuerySchema,
  appointmentIdParamSchema,
} from '../schemas/appointment.schema.js';
import { authenticate } from '../utils/auth.js';

// Helper para incluir dados completos do cliente
const clientSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  createdAt: true,
};

// Helper para incluir dados completos do profissional
const professionalSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  professionalProfile: {
    select: {
      ratingAvg: true,
      reviewCount: true,
    },
  },
};

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

      // 🔍 Log dos dados recebidos

      // Verificar se o profissional existe
      const professionalProfile = await fastify.prisma.user.findUnique({
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
          professionalId: professionalProfile.id,
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
          client: { select: clientSelect },
          professional: { select: clientSelect },
          subcategory: { include: { category: true } },
          address: true,
        },
      });

      // Buscar total de appointments CONCLUÍDOS do cliente
      const clientAppointmentsCount = await fastify.prisma.appointment.count({
        where: { 
          clientId: appointment.clientId,
          status: 'COMPLETED'
        },
      });

      reply.code(201);
      return {
        ...appointment,
        client: {
          ...appointment.client,
          totalAppointments: clientAppointmentsCount,
        },
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
            client: { select: clientSelect },
            professional: { select: clientSelect },
            subcategory: { include: { category: true } },
            address: true,
          },
        }),
        fastify.prisma.appointment.count({ where }),
      ]);

      // Buscar total de appointments CONCLUÍDOS para cada cliente e profissional único
      const clientIds = [...new Set(appointments.map(apt => apt.clientId))];
      const professionalIds = [...new Set(appointments.map(apt => apt.professionalId))];
      
      const clientAppointmentsCounts = await Promise.all(
        clientIds.map(async (clientId) => ({
          clientId,
          count: await fastify.prisma.appointment.count({ 
            where: { 
              clientId,
              status: 'COMPLETED'
            } 
          }),
        }))
      );
      
      const professionalAppointmentsCounts = await Promise.all(
        professionalIds.map(async (professionalId) => ({
          professionalId,
          count: await fastify.prisma.appointment.count({ 
            where: { 
              professionalId,
              status: 'COMPLETED'
            } 
          }),
        }))
      );
      
      const clientCountsMap = Object.fromEntries(
        clientAppointmentsCounts.map(c => [c.clientId, c.count])
      );
      
      const professionalCountsMap = Object.fromEntries(
        professionalAppointmentsCounts.map(c => [c.professionalId, c.count])
      );

      return {
        data: appointments.map(apt => ({
          ...apt,
          client: apt.client ? {
            ...apt.client,
            totalAppointments: clientCountsMap[apt.clientId] || 0,
          } : null,
          professional: apt.professional ? {
            ...apt.professional,
            totalAppointments: professionalCountsMap[apt.professionalId] || 0,
          } : null,
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
          client: { select: clientSelect },
          professional: { select: professionalSelect },
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
          client: { select: clientSelect },
          professional: { select: professionalSelect },
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
          client: { select: clientSelect },
          professional: { select: professionalSelect },
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
          client: { select: clientSelect },
          professional: { select: professionalSelect },
          subcategory: { include: { category: true } },
          address: true,
        },
      });

      // Incrementar contador de serviços completados do profissional
      await fastify.prisma.professionalProfile.update({
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

  // Profissional está a caminho
  fastify.patch<{ Params: { appointmentId: string } }>(
    '/appointments/:appointmentId/on-way',
    {
      schema: {
        tags: ['appointments'],
        description: 'Mark professional as on the way',
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
        return { error: 'Only the professional can update status' };
      }

      if (appointment.status !== 'CONFIRMED') {
        reply.code(400);
        return { error: 'Only confirmed appointments can be marked as on way' };
      }

      const updated = await fastify.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'ON_WAY',
        },
        include: {
          client: { select: clientSelect },
          professional: { select: professionalSelect },
          subcategory: { include: { category: true } },
          address: true,
        },
      });

      return {
        id: updated.id,
        clientId: updated.clientId,
        professionalId: updated.professionalId,
        subcategoryId: updated.subcategoryId,
        addressId: updated.addressId,
        status: updated.status,
        price: updated.price,
        notes: updated.notes,
        scheduledTime: updated.scheduledTime,
        client: updated.client,
        professional: updated.professional,
        subcategory: updated.subcategory,
        address: updated.address,
        createdAt: updated.createdAt.toISOString(),
        scheduledDate: updated.scheduledDate.toISOString(),
        confirmedAt: updated.confirmedAt?.toISOString() || null,
        startedAt: updated.startedAt?.toISOString() || null,
        completedAt: updated.completedAt?.toISOString() || null,
        cancelledAt: updated.cancelledAt?.toISOString() || null,
      };
    }
  );

  // Iniciar serviço
  fastify.patch<{ Params: { appointmentId: string } }>(
    '/appointments/:appointmentId/start',
    {
      schema: {
        tags: ['appointments'],
        description: 'Start service',
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
        return { error: 'Only the professional can start service' };
      }

      if (appointment.status !== 'ON_WAY' && appointment.status !== 'CONFIRMED') {
        reply.code(400);
        return { error: 'Cannot start service from current status' };
      }

      const updated = await fastify.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
        include: {
          client: { select: clientSelect },
          professional: { select: professionalSelect },
          subcategory: { include: { category: true } },
          address: true,
        },
      });

      return {
        id: updated.id,
        clientId: updated.clientId,
        professionalId: updated.professionalId,
        subcategoryId: updated.subcategoryId,
        addressId: updated.addressId,
        status: updated.status,
        price: updated.price,
        notes: updated.notes,
        scheduledTime: updated.scheduledTime,
        client: updated.client,
        professional: updated.professional,
        subcategory: updated.subcategory,
        address: updated.address,
        createdAt: updated.createdAt.toISOString(),
        scheduledDate: updated.scheduledDate.toISOString(),
        confirmedAt: updated.confirmedAt?.toISOString() || null,
        startedAt: updated.startedAt?.toISOString() || null,
        completedAt: updated.completedAt?.toISOString() || null,
        cancelledAt: updated.cancelledAt?.toISOString() || null,
      };
    }
  );

  // Rejeitar agendamento (profissional)
  fastify.patch<{ 
    Params: { appointmentId: string },
    Body: { reason?: string }
  }>(
    '/appointments/:appointmentId/reject',
    {
      schema: {
        tags: ['appointments'],
        description: 'Reject appointment (professional only)',
        params: appointmentIdParamSchema,
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

      if (appointment.professionalId !== userId) {
        reply.code(403);
        return { error: 'Only the professional can reject' };
      }

      if (appointment.status !== 'PENDING') {
        reply.code(400);
        return { error: 'Only pending appointments can be rejected' };
      }

      const updated = await fastify.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'REJECTED',
          cancelledAt: new Date(),
          notes: reason ? `Rejeitado: ${reason}` : appointment.notes,
        },
        include: {
          client: { select: clientSelect },
          professional: { select: professionalSelect },
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
};

export default appointmentRoute;

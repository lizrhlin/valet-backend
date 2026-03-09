import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  createAppointmentSchema,
  getAppointmentsQuerySchema,
  appointmentIdParamSchema,
} from '../schemas/appointment.schema.js';
import { authenticate } from '../utils/auth.js';
import { NotificationService } from '../services/notification.service.js';

// Helper para incluir dados completos do cliente
const clientSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  clientRatingAvg: true,
  clientReviewCount: true,
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

      // Validar que o horário não é no passado
      // Combina scheduledDate + scheduledTime para comparar com o momento atual
      // O horário do slot (scheduledTime) é em BRT, então criamos a data no timezone do Brasil
      const dateStr = data.scheduledDate.split('T')[0]; // "YYYY-MM-DD"
      const scheduledDateTime = new Date(`${dateStr}T${data.scheduledTime}:00-03:00`);

      if (scheduledDateTime.getTime() <= Date.now()) {
        reply.code(400);
        return {
          error: 'PAST_DATETIME',
          message: 'Não é possível agendar em um horário que já passou.',
        };
      }

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
        return { error: 'PROFESSIONAL_NOT_FOUND', message: 'Profissional não encontrado.' };
      }

      // Verificar se oferece esse serviço
      if (professionalProfile.subcategories.length === 0) {
        reply.code(400);
        return { error: 'SERVICE_NOT_OFFERED', message: 'Este profissional não oferece mais este serviço.' };
      }

      const servicePrice = professionalProfile.subcategories[0];

      // Verificar endereço
      const address = await fastify.prisma.address.findFirst({
        where: { id: data.addressId, userId },
      });

      
      if (!address) {
        reply.code(404);
        return { error: 'ADDRESS_NOT_FOUND', message: 'Endereço não encontrado. Cadastre um endereço antes de agendar.' };
      }

      // Verificar se o endereço possui coordenadas (obrigatório para agendamento)
      if (address.latitude == null || address.longitude == null) {
        reply.code(400);
        return {
          error: 'LOCATION_REQUIRED',
          message: 'Selecione um endereço válido com localização para encontrar profissionais próximos.',
        };
      }

      // Verificar se o profissional já tem agendamento no mesmo horário
      const existingAppointment = await fastify.prisma.appointment.findFirst({
        where: {
          professionalId: professionalProfile.id,
          scheduledDate: new Date(data.scheduledDate),
          scheduledTime: data.scheduledTime,
          status: { notIn: ['CANCELLED', 'REJECTED'] },
        },
      });

      if (existingAppointment) {
        reply.code(409);
        return {
          error: 'SLOT_UNAVAILABLE',
          message: 'Este horário já está ocupado. Por favor, escolha outro horário.',
        };
      }

      // Verificar se o horário está na disponibilidade do profissional
      const [slotYear, slotMonth, slotDay] = dateStr.split('-').map(Number);
      const slotDateUTC = new Date(Date.UTC(slotYear, slotMonth - 1, slotDay, 12, 0, 0));

      const availableSlot = await fastify.prisma.customAvailability.findFirst({
        where: {
          professionalId: professionalProfile.id,
          date: slotDateUTC,
          timeSlot: data.scheduledTime,
          isAvailable: true,
        },
      });

      if (!availableSlot) {
        reply.code(409);
        return {
          error: 'SLOT_NOT_AVAILABLE',
          message: 'Este horário não está disponível. O profissional pode ter alterado a agenda.',
        };
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
          priceCents: servicePrice.priceCents,
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

      // 🔔 Notificar profissional sobre novo agendamento
      const notificationService = new NotificationService(fastify.prisma);
      try {
        await notificationService.onAppointmentCreated(
          appointment.id,
          appointment.professionalId,
          appointment.client?.name || 'Cliente',
          appointment.subcategory?.name || 'Serviço',
        );
      } catch (e) {
        // Não bloqueia a criação do agendamento se a notificação falhar
        fastify.log.error(e, 'Erro ao criar notificação de agendamento');
      }

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
        return { error: 'APPOINTMENT_NOT_FOUND', message: 'Agendamento não encontrado.' };
      }

      // Verificar acesso
      if (appointment.clientId !== userId && appointment.professionalId !== userId) {
        reply.code(403);
        return { error: 'ACCESS_DENIED', message: 'Você não tem permissão para acessar este agendamento.' };
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
        return { error: 'APPOINTMENT_NOT_FOUND', message: 'Agendamento não encontrado.' };
      }

      // Cliente ou profissional podem cancelar
      if (appointment.clientId !== userId && appointment.professionalId !== userId) {
        reply.code(403);
        return { error: 'ACCESS_DENIED', message: 'Você não tem permissão para cancelar este agendamento.' };
      }

      if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED') {
        reply.code(400);
        return { error: 'CANNOT_CANCEL', message: 'Este agendamento não pode mais ser cancelado.' };
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

      // 🔔 Notificar a outra parte sobre o cancelamento
      const notifService = new NotificationService(fastify.prisma);
      try {
        const isClientCancelling = userId === appointment.clientId;
        const recipientId = isClientCancelling ? appointment.professionalId : appointment.clientId;
        const cancellerName = isClientCancelling
          ? (updated.client?.name || 'Cliente')
          : (updated.professional?.name || 'Profissional');
        await notifService.onAppointmentCancelled(
          appointmentId,
          recipientId,
          cancellerName,
          updated.subcategory?.name || 'Serviço',
        );
      } catch (e) {
        fastify.log.error(e, 'Erro ao criar notificação de cancelamento');
      }

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
        return { error: 'APPOINTMENT_NOT_FOUND', message: 'Agendamento não encontrado.' };
      }

      if (appointment.professionalId !== userId) {
        reply.code(403);
        return { error: 'ACCESS_DENIED', message: 'Apenas o profissional pode confirmar este agendamento.' };
      }

      if (appointment.status !== 'PENDING') {
        reply.code(400);
        return { error: 'INVALID_STATUS', message: 'Apenas agendamentos pendentes podem ser confirmados.' };
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

      // 🔔 Notificar cliente que o agendamento foi aceito
      const notifService = new NotificationService(fastify.prisma);
      try {
        await notifService.onAppointmentAccepted(
          appointmentId,
          appointment.clientId,
          updated.professional?.name || 'Profissional',
          updated.subcategory?.name || 'Serviço',
        );
      } catch (e) {
        fastify.log.error(e, 'Erro ao criar notificação de aceite');
      }

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
        return { error: 'APPOINTMENT_NOT_FOUND', message: 'Agendamento não encontrado.' };
      }

      if (appointment.professionalId !== userId) {
        reply.code(403);
        return { error: 'ACCESS_DENIED', message: 'Apenas o profissional pode finalizar este serviço.' };
      }

      if (appointment.status !== 'IN_PROGRESS') {
        reply.code(400);
        return { error: 'INVALID_STATUS', message: 'Apenas serviços em andamento podem ser finalizados.' };
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

      // 🔔 Notificar cliente e profissional sobre conclusão
      const notifService = new NotificationService(fastify.prisma);
      try {
        await notifService.onAppointmentCompleted(
          appointmentId,
          appointment.clientId,
          appointment.professionalId,
          updated.professional?.name || 'Profissional',
          updated.subcategory?.name || 'Serviço',
        );
      } catch (e) {
        fastify.log.error(e, 'Erro ao criar notificação de conclusão');
      }

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
        return { error: 'APPOINTMENT_NOT_FOUND', message: 'Agendamento não encontrado.' };
      }

      if (appointment.professionalId !== userId) {
        reply.code(403);
        return { error: 'ACCESS_DENIED', message: 'Apenas o profissional pode atualizar o status.' };
      }

      if (appointment.status !== 'CONFIRMED') {
        reply.code(400);
        return { error: 'INVALID_STATUS', message: 'Apenas agendamentos confirmados podem ser marcados como a caminho.' };
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

      // Notificar o cliente que o profissional está a caminho
      try {
        const notifService = new NotificationService(fastify.prisma);
        await notifService.onAppointmentOnWay(
          appointmentId,
          appointment.clientId,
          updated.professional?.name || 'Profissional',
          updated.subcategory?.name || 'serviço',
        );
      } catch (e) {
        request.log.error(e, 'Falha ao criar notificação de a caminho');
      }

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
        return { error: 'APPOINTMENT_NOT_FOUND', message: 'Agendamento não encontrado.' };
      }

      if (appointment.professionalId !== userId) {
        reply.code(403);
        return { error: 'ACCESS_DENIED', message: 'Apenas o profissional pode iniciar o serviço.' };
      }

      if (appointment.status !== 'ON_WAY' && appointment.status !== 'CONFIRMED') {
        reply.code(400);
        return { error: 'INVALID_STATUS', message: 'Não é possível iniciar o serviço com o status atual.' };
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

      // Notificar o cliente que o serviço foi iniciado
      try {
        const notifService = new NotificationService(fastify.prisma);
        await notifService.onAppointmentStarted(
          appointmentId,
          appointment.clientId,
          updated.professional?.name || 'Profissional',
          updated.subcategory?.name || 'serviço',
        );
      } catch (e) {
        request.log.error(e, 'Falha ao criar notificação de serviço iniciado');
      }

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
        return { error: 'APPOINTMENT_NOT_FOUND', message: 'Agendamento não encontrado.' };
      }

      if (appointment.professionalId !== userId) {
        reply.code(403);
        return { error: 'ACCESS_DENIED', message: 'Apenas o profissional pode rejeitar este agendamento.' };
      }

      if (appointment.status !== 'PENDING') {
        reply.code(400);
        return { error: 'INVALID_STATUS', message: 'Apenas agendamentos pendentes podem ser rejeitados.' };
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

      // 🔔 Notificar cliente que o agendamento foi recusado
      const notifService = new NotificationService(fastify.prisma);
      try {
        await notifService.onAppointmentRejected(
          appointmentId,
          appointment.clientId,
          updated.professional?.name || 'Profissional',
          updated.subcategory?.name || 'Serviço',
        );
      } catch (e) {
        fastify.log.error(e, 'Erro ao criar notificação de rejeição');
      }

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

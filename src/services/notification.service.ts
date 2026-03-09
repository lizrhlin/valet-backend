import { PrismaClient, NotificationType } from '@prisma/client';

/**
 * Serviço para criação de notificações in-app.
 * Usado internamente pelo backend quando eventos de agendamento ocorrem.
 * Preparado para Fase 2 (push notifications via Firebase).
 */

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  appointmentId?: string;
  data?: Record<string, any>;
}

export class NotificationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Cria uma notificação no banco de dados.
   * Respeita a preferência notificationsEnabled do usuário.
   * No futuro (Fase 2), também enviará push notification.
   */
  async create(params: CreateNotificationParams) {
    // Verificar se o usuário habilitou notificações
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: { notificationsEnabled: true },
    });

    if (user && !user.notificationsEnabled) {
      // Usuário desabilitou notificações — não criar
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        appointmentId: params.appointmentId ?? undefined,
        data: params.data ?? undefined,
      },
    });

    // TODO Fase 2: Enviar push notification via Firebase
    // await this.sendPush(params.userId, params.title, params.message);

    return notification;
  }

  // ==========================================
  // Helpers para eventos de agendamento
  // ==========================================

  /** Agendamento criado — notifica o profissional */
  async onAppointmentCreated(appointmentId: string, professionalId: string, clientName: string, serviceName: string) {
    return this.create({
      userId: professionalId,
      type: 'APPOINTMENT_CREATED',
      title: 'Novo agendamento',
      message: `${clientName} solicitou um serviço de ${serviceName}.`,
      appointmentId,
      data: { clientName, serviceName },
    });
  }

  /** Agendamento aceito — notifica o cliente */
  async onAppointmentAccepted(appointmentId: string, clientId: string, professionalName: string, serviceName: string) {
    return this.create({
      userId: clientId,
      type: 'APPOINTMENT_ACCEPTED',
      title: 'Agendamento aceito',
      message: `${professionalName} aceitou seu pedido de ${serviceName}.`,
      appointmentId,
      data: { professionalName, serviceName },
    });
  }

  /** Agendamento rejeitado — notifica o cliente */
  async onAppointmentRejected(appointmentId: string, clientId: string, professionalName: string, serviceName: string) {
    return this.create({
      userId: clientId,
      type: 'APPOINTMENT_REJECTED',
      title: 'Agendamento recusado',
      message: `${professionalName} recusou seu pedido de ${serviceName}.`,
      appointmentId,
      data: { professionalName, serviceName },
    });
  }

  /** Agendamento cancelado — notifica a outra parte */
  async onAppointmentCancelled(appointmentId: string, recipientId: string, cancellerName: string, serviceName: string) {
    return this.create({
      userId: recipientId,
      type: 'APPOINTMENT_CANCELLED',
      title: 'Agendamento cancelado',
      message: `${cancellerName} cancelou o agendamento de ${serviceName}.`,
      appointmentId,
      data: { cancellerName, serviceName },
    });
  }

  /** Profissional a caminho — notifica o cliente */
  async onAppointmentOnWay(appointmentId: string, clientId: string, professionalName: string, serviceName: string) {
    return this.create({
      userId: clientId,
      type: 'APPOINTMENT_ON_WAY',
      title: 'Profissional a caminho',
      message: `${professionalName} está a caminho para o serviço de ${serviceName}.`,
      appointmentId,
      data: { professionalName, serviceName },
    });
  }

  /** Serviço iniciado — notifica o cliente */
  async onAppointmentStarted(appointmentId: string, clientId: string, professionalName: string, serviceName: string) {
    return this.create({
      userId: clientId,
      type: 'APPOINTMENT_STARTED',
      title: 'Serviço iniciado',
      message: `${professionalName} iniciou o serviço de ${serviceName}.`,
      appointmentId,
      data: { professionalName, serviceName },
    });
  }

  /** Agendamento concluído — notifica o cliente (e opcionalmente o profissional) */
  async onAppointmentCompleted(appointmentId: string, clientId: string, professionalId: string, professionalName: string, serviceName: string) {
    // Notifica o cliente
    await this.create({
      userId: clientId,
      type: 'APPOINTMENT_COMPLETED',
      title: 'Serviço concluído',
      message: `${professionalName} concluiu o serviço de ${serviceName}.`,
      appointmentId,
      data: { professionalName, serviceName },
    });

    // Notifica o profissional (confirmação)
    await this.create({
      userId: professionalId,
      type: 'APPOINTMENT_COMPLETED',
      title: 'Atendimento concluído',
      message: `O serviço de ${serviceName} foi marcado como concluído.`,
      appointmentId,
      data: { serviceName },
    });
  }
}

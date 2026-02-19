import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  searchProfessionalsSchema,
  searchProfessionalsGeoSchema,
  professionalIdParamSchema,
  SearchProfessionalsInput,
  SearchProfessionalsGeoInput,
} from '../schemas/professional.schema.js';

const professionalRoute: FastifyPluginAsync = async (fastify) => {

  /**
   * Retorna os IDs de profissionais que possuem pelo menos 1 slot futuro
   * disponível (não bloqueado por appointment ativo).
   */
  /**
   * Helper: extrai "YYYY-MM-DD" de um Date usando UTC (Prisma armazena @db.Date como UTC meia-noite)
   */
  const toUTCDateStr = (d: Date): string => {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  };

  const getProfessionalIdsWithFutureSlots = async (): Promise<Set<string>> => {
    const now = new Date();
    // Usar hora local para comparar com slots (horários do profissional são em hora local BR)
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    // Data de hoje em UTC para query do Prisma (@db.Date é armazenado como UTC meia-noite)
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const todayStr = toUTCDateStr(todayUTC);

    // Buscar todos os slots futuros disponíveis
    const futureSlots = await fastify.prisma.customAvailability.findMany({
      where: {
        isAvailable: true,
        date: { gte: todayUTC },
      },
      select: {
        professionalId: true,
        date: true,
        timeSlot: true,
      },
    });

    // Filtrar slots de hoje que já passaram
    const validSlots = futureSlots.filter(slot => {
      const slotDateStr = toUTCDateStr(new Date(slot.date));
      if (slotDateStr === todayStr) {
        return slot.timeSlot > nowHHMM;
      }
      return true;
    });

    if (validSlots.length === 0) return new Set();

    // Buscar appointments ativos que bloqueiam slots
    const blockedAppointments = await fastify.prisma.appointment.findMany({
      where: {
        scheduledDate: { gte: todayUTC },
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
      select: {
        professionalId: true,
        scheduledDate: true,
        scheduledTime: true,
      },
    });

    // Criar set de slots bloqueados: "profId|date|time"
    const blockedSet = new Set(
      blockedAppointments.map(apt => {
        const dateStr = toUTCDateStr(new Date(apt.scheduledDate));
        return `${apt.professionalId}|${dateStr}|${apt.scheduledTime}`;
      })
    );

    // Filtrar slots que não estão bloqueados e coletar profissionais válidos
    const professionalsWithSlots = new Set<string>();
    for (const slot of validSlots) {
      const dateStr = toUTCDateStr(new Date(slot.date));
      const key = `${slot.professionalId}|${dateStr}|${slot.timeSlot}`;
      if (!blockedSet.has(key)) {
        professionalsWithSlots.add(slot.professionalId);
      }
    }

    return professionalsWithSlots;
  };

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

      // Obter IDs de profissionais com slots futuros disponíveis
      const profsWithFutureSlots = await getProfessionalIdsWithFutureSlots();
      if (profsWithFutureSlots.size === 0) {
        return {
          professionals: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
      where.id = { in: Array.from(profsWithFutureSlots) };

      const profileFilter: any = {};

      // Se available for undefined, não filtrar por disponibilidade
      // (mostra todos, incluindo null que serão tratados como disponíveis)
      // Se available=true, mostrar apenas os com agenda aberta
      // Se available=false, mostrar apenas os com agenda fechada
      if (available === true) {
        profileFilter.isAvailable = true;
      } else if (available === false) {
        profileFilter.isAvailable = false;
      }
      // Se available === undefined, não adiciona nenhum filtro
      // (backend considera null como disponível por padrão)

      if (minRating) {
        profileFilter.ratingAvg = { gte: minRating };
      }

      if (Object.keys(profileFilter).length > 0) {
        where.professionalProfile = { is: profileFilter };
      } else {
        where.professionalProfile = { isNot: null };
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
      if (sortBy === 'rating') orderBy.professionalProfile = { ratingAvg: sortOrder };
      else if (sortBy === 'servicesCompleted') orderBy.professionalProfile = { servicesCompleted: sortOrder };
      else orderBy.professionalProfile = { ratingAvg: 'desc' }; // default

      // Buscar profissionais
      const professionals = await fastify.prisma.user.findMany({
        where,
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
        orderBy,
        skip,
        take: limit,
      });

      return {
        professionals: professionals.map(prof => {
          const defaultAddress = prof.addresses?.[0];
          const locationParts = [defaultAddress?.neighborhood, defaultAddress?.city, defaultAddress?.state].filter(Boolean);
          return {
            ...prof,
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
            hasFutureSlots: true,
            createdAt: prof.createdAt.toISOString(),
            updatedAt: prof.updatedAt.toISOString(),
          };
        }),
        total,
        page,
        limit,
        totalPages,
      };
    }
  );

  // ============================================
  // POST /professionals/search — Busca geo com earth_distance
  // ============================================
  fastify.post<{ Body: SearchProfessionalsGeoInput }>(
    '/professionals/search',
    {
      schema: {
        tags: ['professionals'],
        description: 'Search professionals by geolocation (earth_distance)',
        body: searchProfessionalsGeoSchema,
      },
    },
    async (request, reply) => {
      const { lat, lng, subcategoryId, categoryId, minRating, available, page = 1, limit = 10 } = request.body;

      // Validação redundante (Zod já valida, mas garantia explícita)
      if (lat == null || lng == null) {
        reply.code(400);
        return {
          error: 'LOCATION_REQUIRED',
          message: 'Selecione um endereço válido com localização para encontrar profissionais próximos.',
        };
      }

      // Construir filtros SQL dinâmicos
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const conditions: string[] = [
        `u."userType" = 'PROFESSIONAL'`,
        `pp."latitude" IS NOT NULL`,
        `pp."longitude" IS NOT NULL`,
        // earth_distance: calcula distância em metros entre duas coordenadas
        `earth_distance(ll_to_earth(pp."latitude", pp."longitude"), ll_to_earth($1, $2)) <= pp."service_radius_km" * 1000`,
        // Filtro de slots futuros disponíveis (sem appointment ativo bloqueando)
        `EXISTS (
          SELECT 1 FROM custom_availability ca
          WHERE ca."professional_id" = u."id"
            AND ca."isAvailable" = true
            AND ca."date" >= '${todayStr}'::date
            AND NOT (
              ca."date" = '${todayStr}'::date AND ca."timeSlot" <= '${nowHHMM}'
            )
            AND NOT EXISTS (
              SELECT 1 FROM appointments apt
              WHERE apt."professional_id" = ca."professional_id"
                AND apt."scheduledDate"::date = ca."date"
                AND apt."scheduledTime" = ca."timeSlot"
                AND apt."status" NOT IN ('CANCELLED', 'REJECTED')
            )
        )`,
      ];
      const params: any[] = [lat, lng];
      let paramIndex = 3;

      // Filtro por subcategoria (obrigatório)
      conditions.push(`ps."subcategory_id" = $${paramIndex}`);
      params.push(subcategoryId);
      paramIndex++;

      // Filtro por categoria (opcional)
      if (categoryId) {
        conditions.push(`EXISTS (SELECT 1 FROM professional_categories pc WHERE pc."professional_id" = u."id" AND pc."category_id" = $${paramIndex})`);
        params.push(categoryId);
        paramIndex++;
      }

      // Filtro por rating mínimo
      if (minRating != null) {
        conditions.push(`pp."rating_avg" >= $${paramIndex}`);
        params.push(minRating);
        paramIndex++;
      }

      // Filtro por disponibilidade
      if (available === true) {
        conditions.push(`pp."is_available" = true`);
      } else if (available === false) {
        conditions.push(`pp."is_available" = false`);
      }

      const whereClause = conditions.join(' AND ');

      // Count total
      const countQuery = `
        SELECT COUNT(DISTINCT u."id")::int AS total
        FROM users u
        INNER JOIN professional_profiles pp ON pp."user_id" = u."id"
        INNER JOIN professional_subcategories ps ON ps."professional_id" = u."id" AND ps."isActive" = true
        WHERE ${whereClause}
      `;

      const countResult = await fastify.prisma.$queryRawUnsafe<[{ total: number }]>(countQuery, ...params);
      const total = countResult[0]?.total ?? 0;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;

      // Main query — ordered by distance ASC
      const dataQuery = `
        SELECT
          u."id",
          u."name",
          u."email",
          u."phone",
          u."avatar",
          u."createdAt",
          u."updatedAt",
          pp."latitude",
          pp."longitude",
          pp."service_radius_km" AS "serviceRadiusKm",
          pp."is_available" AS "isAvailable",
          pp."is_verified" AS "isVerified",
          pp."rating_avg" AS "ratingAvg",
          pp."review_count" AS "reviewCount",
          pp."services_completed" AS "servicesCompleted",
          pp."experience_range" AS "experienceRange",
          pp."primary_category_id" AS "primaryCategoryId",
          ROUND(earth_distance(ll_to_earth(pp."latitude", pp."longitude"), ll_to_earth($1, $2))::numeric, 0) AS "distanceMeters",
          ps."price_cents" AS "priceCents",
          ps."subcategory_id" AS "subcategoryId"
        FROM users u
        INNER JOIN professional_profiles pp ON pp."user_id" = u."id"
        INNER JOIN professional_subcategories ps ON ps."professional_id" = u."id" AND ps."isActive" = true
        WHERE ${whereClause}
        ORDER BY earth_distance(ll_to_earth(pp."latitude", pp."longitude"), ll_to_earth($1, $2)) ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const professionals = await fastify.prisma.$queryRawUnsafe<any[]>(dataQuery, ...params);

      return {
        professionals: professionals.map((prof: any) => ({
          id: prof.id,
          name: prof.name,
          email: prof.email,
          phone: prof.phone,
          avatar: prof.avatar,
          latitude: prof.latitude,
          longitude: prof.longitude,
          serviceRadiusKm: prof.serviceRadiusKm,
          available: prof.isAvailable ?? false,
          isVerified: prof.isVerified ?? false,
          rating: Number(prof.ratingAvg) || 0,
          reviewCount: Number(prof.reviewCount) || 0,
          servicesCompleted: Number(prof.servicesCompleted) || 0,
          experienceRange: prof.experienceRange,
          distanceMeters: Number(prof.distanceMeters) || 0,
          distanceKm: Number(((Number(prof.distanceMeters) || 0) / 1000).toFixed(1)),
          priceCents: Number(prof.priceCents) || 0,
          subcategoryId: prof.subcategoryId,
          hasFutureSlots: true,
          createdAt: prof.createdAt instanceof Date ? prof.createdAt.toISOString() : prof.createdAt,
          updatedAt: prof.updatedAt instanceof Date ? prof.updatedAt.toISOString() : prof.updatedAt,
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
          createdAt: true,
          updatedAt: true,
          userType: true,
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
      });

      if (!professional || professional.userType !== 'PROFESSIONAL' || !professional.professionalProfile) {
        reply.code(404);
        return { error: 'Professional not found' };
      }

      const defaultAddress = professional.addresses?.[0];
      const locationParts = [defaultAddress?.neighborhood, defaultAddress?.city, defaultAddress?.state].filter(Boolean);

      return {
        ...professional,
        specialty: professional.professionalProfile?.primaryCategory?.name || null,
        experience: professional.professionalProfile?.experienceRange || null,
        servicesCompleted: professional.professionalProfile?.servicesCompleted ?? 0,
        available: professional.professionalProfile?.isAvailable ?? false,
        isVerified: professional.professionalProfile?.isVerified ?? false,
        rating: professional.professionalProfile?.ratingAvg ?? 0,
        reviewCount: professional.professionalProfile?.reviewCount ?? 0,
        location: locationParts.length > 0 ? locationParts.join(', ') : null,
        latitude: professional.professionalProfile?.latitude ?? null,
        longitude: professional.professionalProfile?.longitude ?? null,
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
        priceCents: number;
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
            priceCents: z.number().int().positive(),
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
        include: { professionalProfile: true },
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
            priceCents: sub.priceCents,
            isActive: sub.isActive ?? true,
          },
          create: {
            professionalId,
            subcategoryId: sub.subcategoryId,
            priceCents: sub.priceCents,
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
              imageUrl: true,
              categoryId: true,
              category: {
                select: { id: true, name: true, slug: true },
              },
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
    async (request, _reply) => {
      const { professionalId } = request.params;
      const { startDate, endDate } = request.query;

      // Sempre filtrar datas passadas — nunca retornar disponibilidade de ontem
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const where: any = {
        professionalId,
        date: { gte: today },
      };

      if (startDate || endDate) {
        if (startDate) {
          const start = new Date(startDate);
          // Usar a data mais recente entre startDate e hoje
          where.date.gte = start > today ? start : today;
        }
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
        include: { professionalProfile: true },
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
        include: { professionalProfile: true },
      });

      if (!professional || professional.userType !== 'PROFESSIONAL' || !professional.professionalProfile) {
        reply.code(404);
        return { error: 'Professional not found' };
      }

      // Atualizar status no perfil profissional
      await fastify.prisma.professionalProfile.update({
        where: { userId: professionalId },
        data: { isAvailable: available },
      });

      return {
        message: 'Availability status updated successfully',
        available,
      };
    }
  );
};

export default professionalRoute;

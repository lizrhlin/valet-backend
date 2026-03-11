import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate } from "../utils/auth.js";

const documentRoute: FastifyPluginAsync = async (fastify) => {
  // GET /documents - List user's documents (authenticated)
  fastify.get(
    "/documents",
    {
      onRequest: [authenticate],
      schema: {
        tags: ["documents"],
        description: "Get current user's documents",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              documents: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    type: { type: "string", enum: ["SELFIE_WITH_DOCUMENT", "ID_DOCUMENT"] },
                    url: { type: "string" },
                    status: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"] },
                    rejectionReason: { type: ["string", "null"] },
                    reviewedAt: { type: ["string", "null"] },
                    createdAt: { type: "string" },
                    updatedAt: { type: "string" },
                  },
                },
              },
            },
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;

      const documents = await fastify.prisma.userDocument.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
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
      });

      return {
        documents: documents.map((doc) => ({
          ...doc,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
          reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : null,
        })),
      };
    }
  );

  // GET /documents/:documentId - Get specific document
  fastify.get<{
    Params: { documentId: string };
  }>(
    "/documents/:documentId",
    {
      onRequest: [authenticate],
      schema: {
        tags: ["documents"],
        description: "Get specific document",
        security: [{ bearerAuth: [] }],
        params: z.object({
          documentId: z.string(),
        }),
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              userId: { type: "string" },
              type: { type: "string", enum: ["SELFIE_WITH_DOCUMENT", "ID_DOCUMENT"] },
              url: { type: "string" },
              status: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"] },
              rejectionReason: { type: ["string", "null"] },
              reviewedAt: { type: ["string", "null"] },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
            },
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { documentId } = request.params;

      const document = await fastify.prisma.userDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        reply.code(404);
        return { error: "Document not found" };
      }

      // Ensure user owns this document
      if (document.userId !== userId) {
        reply.code(404);
        return { error: "Document not found" };
      }

      return {
        ...document,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
        reviewedAt: document.reviewedAt ? document.reviewedAt.toISOString() : null,
      };
    }
  );

  // POST /documents - Upload new document
  fastify.post<{
    Body: {
      type: "SELFIE_WITH_DOCUMENT" | "ID_DOCUMENT";
      url: string;
    };
  }>(
    "/documents",
    {
      onRequest: [authenticate],
      schema: {
        tags: ["documents"],
        description: "Add a new verification document",
        security: [{ bearerAuth: [] }],
        body: z.object({
          type: z.enum(["SELFIE_WITH_DOCUMENT", "ID_DOCUMENT"]),
          url: z.string().url("URL do documento inválida"),
        }),
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              userId: { type: "string" },
              type: { type: "string" },
              url: { type: "string" },
              status: { type: "string" },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
            },
          },
          400: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { type, url } = request.body;

      // Check for duplicates of the same type
      const existingDoc = await fastify.prisma.userDocument.findFirst({
        where: {
          userId,
          type,
        },
      });

      if (existingDoc) {
        reply.code(400);
        return { error: `Document type ${type} already exists. Please update the existing document instead.` };
      }

      const document = await fastify.prisma.userDocument.create({
        data: {
          userId,
          type,
          url,
          status: "PENDING",
        },
      });

      reply.code(201);
      return {
        ...document,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      };
    }
  );

  // PUT /documents/:documentId - Update document (replace URL)
  fastify.put<{
    Params: { documentId: string };
    Body: {
      url: string;
    };
  }>(
    "/documents/:documentId",
    {
      onRequest: [authenticate],
      schema: {
        tags: ["documents"],
        description: "Update a verification document URL",
        security: [{ bearerAuth: [] }],
        params: z.object({
          documentId: z.string(),
        }),
        body: z.object({
          url: z.string().url("URL do documento inválida"),
        }),
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              userId: { type: "string" },
              type: { type: "string" },
              url: { type: "string" },
              status: { type: "string" },
              updatedAt: { type: "string" },
            },
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { documentId } = request.params;
      const { url } = request.body;

      const document = await fastify.prisma.userDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        reply.code(404);
        return { error: "Document not found" };
      }

      if (document.userId !== userId) {
        reply.code(404);
        return { error: "Document not found" };
      }

      // Reset status to PENDING when updating
      const updated = await fastify.prisma.userDocument.update({
        where: { id: documentId },
        data: {
          url,
          status: "PENDING", // Reset to pending for re-review
        },
      });

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null,
      };
    }
  );

  // DELETE /documents/:documentId - Delete document
  fastify.delete<{
    Params: { documentId: string };
  }>(
    "/documents/:documentId",
    {
      onRequest: [authenticate],
      schema: {
        tags: ["documents"],
        description: "Delete a verification document",
        security: [{ bearerAuth: [] }],
        params: z.object({
          documentId: z.string(),
        }),
        response: {
          204: {
            type: "null",
          },
          401: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { documentId } = request.params;

      const document = await fastify.prisma.userDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        reply.code(404);
        return { error: "Document not found" };
      }

      if (document.userId !== userId) {
        reply.code(404);
        return { error: "Document not found" };
      }

      await fastify.prisma.userDocument.delete({
        where: { id: documentId },
      });

      reply.code(204);
      return null;
    }
  );

  // ============================================
  // ADMIN — Aprovação / Rejeição de profissionais
  // ============================================

  // POST /documents/admin/approve-professional/:userId
  // Aprova todos os documentos do profissional e marca isVerified=true
  fastify.post<{
    Params: { userId: string };
  }>(
    "/documents/admin/approve-professional/:userId",
    {
      schema: {
        tags: ["documents", "admin"],
        description: "Approve a professional (mark verified, approve all documents)",
        params: z.object({
          userId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { userId } = request.params;

      // Verificar se o usuário existe e é profissional
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        include: { professionalProfile: true, documents: true },
      });

      if (!user || user.userType !== "PROFESSIONAL" || !user.professionalProfile) {
        reply.code(404);
        return { error: "Professional not found" };
      }

      // Aprovar todos os documentos pendentes
      await fastify.prisma.userDocument.updateMany({
        where: { userId, status: "PENDING" },
        data: { status: "APPROVED", reviewedAt: new Date() },
      });

      // Marcar profissional como verificado (visibilidade pública)
      await fastify.prisma.professionalProfile.update({
        where: { userId },
        data: {
          isVerified: true,
          onboardingStatus: "VERIFIED",
        },
      });

      // users.status permanece ACTIVE (não muda — responsabilidade separada)

      return {
        message: "Professional approved successfully",
        userId,
        isVerified: true,
        onboardingStatus: "VERIFIED",
      };
    }
  );

  // POST /documents/admin/reject-professional/:userId
  // Rejeita o profissional com motivo
  fastify.post<{
    Params: { userId: string };
    Body: { reason?: string };
  }>(
    "/documents/admin/reject-professional/:userId",
    {
      schema: {
        tags: ["documents", "admin"],
        description: "Reject a professional with optional reason",
        params: z.object({
          userId: z.string(),
        }),
        body: z.object({
          reason: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const { reason } = request.body;

      // Verificar se o usuário existe e é profissional
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        include: { professionalProfile: true },
      });

      if (!user || user.userType !== "PROFESSIONAL" || !user.professionalProfile) {
        reply.code(404);
        return { error: "Professional not found" };
      }

      // Rejeitar todos os documentos pendentes
      await fastify.prisma.userDocument.updateMany({
        where: { userId, status: "PENDING" },
        data: {
          status: "REJECTED",
          rejectionReason: reason || "Documentos não aprovados pela equipe",
          reviewedAt: new Date(),
        },
      });

      // Marcar profissional como rejeitado (não aparece na busca pública)
      await fastify.prisma.professionalProfile.update({
        where: { userId },
        data: {
          isVerified: false,
          onboardingStatus: "REJECTED",
        },
      });

      // users.status permanece ACTIVE (conta ativa, apenas não verificado)

      return {
        message: "Professional rejected",
        userId,
        isVerified: false,
        onboardingStatus: "REJECTED",
        reason: reason || "Documentos não aprovados pela equipe",
      };
    }
  );

  // GET /documents/admin/pending-professionals
  // Lista profissionais com documentos pendentes de revisão
  fastify.get(
    "/documents/admin/pending-professionals",
    {
      schema: {
        tags: ["documents", "admin"],
        description: "List professionals pending verification",
      },
    },
    async () => {
      const pendingProfessionals = await fastify.prisma.user.findMany({
        where: {
          userType: "PROFESSIONAL",
          professionalProfile: {
            isVerified: false,
            onboardingStatus: "SUBMITTED",
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          cpf: true,
          createdAt: true,
          documents: {
            select: {
              id: true,
              type: true,
              url: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
          professionalProfile: {
            select: {
              onboardingStatus: true,
              isVerified: true,
              primaryCategoryId: true,
              primaryCategory: { select: { name: true } },
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return {
        professionals: pendingProfessionals.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          documents: p.documents.map((d) => ({
            ...d,
            createdAt: d.createdAt.toISOString(),
          })),
        })),
        total: pendingProfessionals.length,
      };
    }
  );
};

export default documentRoute;

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
};

export default documentRoute;

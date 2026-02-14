import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { MultipartFile } from "@fastify/multipart";

export async function registerUploadRoutes(fastify: FastifyInstance) {
  // Ensure upload directory exists
  const uploadDir = path.join(process.cwd(), "uploads");
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (err) {
    // Directory already exists
  }

  // POST /uploads - Upload file
  fastify.post<{ Body: any }>(
    "/uploads",
    {
      schema: {
        tags: ["Uploads"],
        summary: "Upload a file",
        description: "Upload a document or image file and return its URL",
        consumes: ["multipart/form-data"],
        response: {
          200: {
            description: "File uploaded successfully",
            type: "object",
            properties: {
              url: { type: "string", example: "/uploads/123e4567-e89b-12d3-a456-426614174000.jpg" },
              filename: { type: "string" },
            },
          },
          400: {
            description: "Bad request - No file provided",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          error: "No file provided",
        });
      }

      try {
        const file = data as MultipartFile;
        const { filename, mimetype } = file;

        // Validate file type (images and PDF only)
        const allowedMimeTypes = [
          "image/jpeg",
          "image/png",
          "application/pdf",
          "image/webp",
        ];
        if (!allowedMimeTypes.includes(mimetype)) {
          return reply.status(400).send({
            error: "Invalid file type. Only JPEG, PNG, WebP and PDF are allowed",
          });
        }

        // Validate file size (max 10MB)
        const buffer = await file.toBuffer();
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (buffer.length > maxSize) {
          return reply.status(400).send({
            error: "File too large. Maximum size is 10MB",
          });
        }

        // Generate unique filename
        const ext = path.extname(filename);
        const uniqueFilename = `${uuidv4()}${ext}`;
        const filePath = path.join(uploadDir, uniqueFilename);

        // Save file to disk
        await fs.writeFile(filePath, buffer);

        // Return relative URL
        const url = `/uploads/${uniqueFilename}`;

        return reply.status(200).send({
          url,
          filename: uniqueFilename,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Failed to upload file",
        });
      }
    }
  );
}


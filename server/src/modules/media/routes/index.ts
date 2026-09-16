import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../../lib/prisma.js";
import { authenticate } from "../../auth/middleware/index.js";
import { requireRole, requirePermission } from "../../permissions/middleware/index.js";
import { Permissions } from "../../permissions/constants/index.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { LocalStorageService } from "../../../services/storage/local-storage.service.js";
import { sendSuccess, sendNotFound, sendError } from "../../../common/responses/index.js";
import { ValidationError } from "../../../lib/errors.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const router = Router();
const storageService = new LocalStorageService();

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DOCUMENT_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIME.has(file.mimetype)) cb(null, true);
    else cb(new ValidationError("Invalid image type. Use JPG, PNG, WEBP or GIF."));
  },
});

const uploadDocuments = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (DOCUMENT_MIME.has(file.mimetype)) cb(null, true);
    else cb(new ValidationError("Invalid document type. Use JPG, PNG, WEBP, GIF or PDF."));
  },
});

const landIdParamsSchema = z.object({ id: z.string().uuid("Invalid land id") });
const projectIdParamsSchema = z.object({ id: z.string().uuid("Invalid project id") });

function publicUrl(req: { get: (name: string) => string | undefined }, relativePath: string): string {
  const host = req.get("host") ?? "localhost:3001";
  return `${req.get("x-forwarded-proto") ?? "http"}://${host}/uploads/${relativePath.split("/").slice(1).join("/")}`;
}

function protectedUrl(relativePath: string): string {
  return `/api/v1/admin/files/${encodeURIComponent(relativePath.split("/")[0])}/${encodeURIComponent(relativePath.split("/").slice(1).join("/"))}`;
}

// ─────────────────────────────────────────────
// Land gallery (public images)
// ─────────────────────────────────────────────
router.post(
  "/lands/:id/gallery",
  authenticate,
  requireRole("admin", "super_admin"),
  requirePermission(Permissions.LANDS_UPDATE),
  validate(landIdParamsSchema, "params"),
  uploadImages.array("files", 20),
  async (req, res) => {
    try {
      const landId = String(req.params.id);
      const land = await prisma.land.findUnique({ where: { id: landId } });
      if (!land) {
        sendNotFound(res, "Land not found");
        return;
      }
      const files = req.files as Express.Multer.File[];
      if (!files?.length) {
        sendError(res, "No files uploaded", 400, "VALIDATION_ERROR");
        return;
      }

      const uploaded: string[] = [];
      for (const file of files) {
        const result = await storageService.upload(file, `public/lands-gallery/${landId}`);
        uploaded.push(publicUrl(req, result.path));
      }

      const gallery = Array.isArray(land.gallery) ? (land.gallery as unknown as string[]) : [];
      const updatedGallery = [...gallery, ...uploaded];

      await prisma.land.update({
        where: { id: landId },
        data: {
          gallery: updatedGallery as unknown as PrismaInputJsonValue,
          ...(land.coverImageUrl ? {} : { coverImageUrl: uploaded[0] }),
        },
      });

      await auditService.logFromRequest(req, {
        action: AuditActions.LAND_UPDATED,
        entityType: "land",
        entityId: landId,
        details: { imagesAdded: uploaded.length },
        success: true,
      });

      sendSuccess(res, { gallery: updatedGallery }, "Gallery updated", 201);
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      throw err;
    }
  },
);

// ─────────────────────────────────────────────
// Land documents (private files)
// ─────────────────────────────────────────────
router.post(
  "/lands/:id/documents",
  authenticate,
  requireRole("admin", "super_admin"),
  requirePermission(Permissions.LANDS_UPDATE),
  validate(landIdParamsSchema, "params"),
  uploadDocuments.array("files", 20),
  async (req, res) => {
    try {
      const landId = String(req.params.id);
      const land = await prisma.land.findUnique({ where: { id: landId } });
      if (!land) {
        sendNotFound(res, "Land not found");
        return;
      }
      const files = req.files as Express.Multer.File[];
      if (!files?.length) {
        sendError(res, "No files uploaded", 400, "VALIDATION_ERROR");
        return;
      }

      const uploaded: string[] = [];
      for (const file of files) {
        const result = await storageService.upload(file, `lands-documents/${landId}`);
        uploaded.push(protectedUrl(result.path));
      }

      const documents = Array.isArray(land.documents)
        ? (land.documents as unknown as string[])
        : [];
      const updatedDocuments = [...documents, ...uploaded];

      await prisma.land.update({
        where: { id: landId },
        data: { documents: updatedDocuments as unknown as PrismaInputJsonValue },
      });

      await auditService.logFromRequest(req, {
        action: AuditActions.LAND_UPDATED,
        entityType: "land",
        entityId: landId,
        details: { documentsAdded: uploaded.length },
        success: true,
      });

      sendSuccess(res, { documents: updatedDocuments }, "Documents updated", 201);
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      throw err;
    }
  },
);

// ─────────────────────────────────────────────
// Project gallery (public images)
// ─────────────────────────────────────────────
router.post(
  "/projects/:id/gallery",
  authenticate,
  requireRole("admin", "super_admin"),
  requirePermission(Permissions.PROJECTS_UPDATE),
  validate(projectIdParamsSchema, "params"),
  uploadImages.array("files", 20),
  async (req, res) => {
    try {
      const projectId = String(req.params.id);
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        sendNotFound(res, "Project not found");
        return;
      }
      const files = req.files as Express.Multer.File[];
      if (!files?.length) {
        sendError(res, "No files uploaded", 400, "VALIDATION_ERROR");
        return;
      }

      const uploaded: string[] = [];
      for (const file of files) {
        const result = await storageService.upload(file, `public/projects-gallery/${projectId}`);
        uploaded.push(publicUrl(req, result.path));
      }

      const gallery = Array.isArray(project.gallery)
        ? (project.gallery as unknown as string[])
        : [];
      const updatedGallery = [...gallery, ...uploaded];

      await prisma.project.update({
        where: { id: projectId },
        data: {
          gallery: updatedGallery as unknown as PrismaInputJsonValue,
          ...(project.coverImageUrl ? {} : { coverImageUrl: uploaded[0] }),
        },
      });

      await auditService.logFromRequest(req, {
        action: AuditActions.PROJECT_UPDATED,
        entityType: "project",
        entityId: projectId,
        details: { imagesAdded: uploaded.length },
        success: true,
      });

      sendSuccess(res, { gallery: updatedGallery }, "Gallery updated", 201);
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      throw err;
    }
  },
);

// ─────────────────────────────────────────────
// Project documents (private files)
// ─────────────────────────────────────────────
router.post(
  "/projects/:id/documents",
  authenticate,
  requireRole("admin", "super_admin"),
  requirePermission(Permissions.PROJECTS_UPDATE),
  validate(projectIdParamsSchema, "params"),
  uploadDocuments.array("files", 20),
  async (req, res) => {
    try {
      const projectId = String(req.params.id);
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        sendNotFound(res, "Project not found");
        return;
      }
      const files = req.files as Express.Multer.File[];
      if (!files?.length) {
        sendError(res, "No files uploaded", 400, "VALIDATION_ERROR");
        return;
      }

      const uploaded: string[] = [];
      for (const file of files) {
        const result = await storageService.upload(file, `projects-documents/${projectId}`);
        uploaded.push(protectedUrl(result.path));
      }

      const documents = Array.isArray(project.documents)
        ? (project.documents as unknown as string[])
        : [];
      const updatedDocuments = [...documents, ...uploaded];

      await prisma.project.update({
        where: { id: projectId },
        data: { documents: updatedDocuments as unknown as PrismaInputJsonValue },
      });

      await auditService.logFromRequest(req, {
        action: AuditActions.PROJECT_UPDATED,
        entityType: "project",
        entityId: projectId,
        details: { documentsAdded: uploaded.length },
        success: true,
      });

      sendSuccess(res, { documents: updatedDocuments }, "Documents updated", 201);
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      throw err;
    }
  },
);

// Re-export the type so the Prisma json cast stays lightweight.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaInputJsonValue = any;

export default router;
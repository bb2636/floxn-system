import type { Express } from "express";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { canAccessObject, ObjectPermission } from "./objectAcl";

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("[Object Storage] Error generating upload URL:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMessage.includes("timeout") || 
                         errorMessage.includes("network") ||
                         errorMessage.includes("ECONNRESET") ||
                         errorMessage.includes("ENOTFOUND");
      
      res.status(500).json({ 
        error: "Failed to generate upload URL",
        message: errorMessage,
        retryable: isRetryable,
        suggestion: isRetryable ? "네트워크 연결이 불안정합니다. 잠시 후 다시 시도해주세요." : "서버 오류가 발생했습니다. 관리자에게 문의해주세요."
      });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * IMPORTANT: All object access requires authentication and ACL checks,
   * including public paths, to prevent unauthorized access to sensitive documents.
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const requestPath = req.path;
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      
      if (!bucketId) {
        return res.status(500).json({ error: "Object Storage not configured" });
      }

      // Check if this is a public path (starts with /objects/public/)
      if (requestPath.startsWith("/objects/public/")) {
        // Public 경로도 인증 및 ACL 체크 필요 (민감 문서 보호)
        if (!req.session?.userId) {
          return res.status(401).json({ error: "인증이 필요합니다" });
        }

        // Extract the path after /objects/
        const objectName = requestPath.slice("/objects/".length);
        const bucket = objectStorageClient.bucket(bucketId);
        const file = bucket.file(objectName);

        const [exists] = await file.exists();
        if (!exists) {
          return res.status(404).json({ error: "Object not found" });
        }

        // ACL 정책 확인
        const canAccess = await canAccessObject({
          userId: req.session.userId,
          objectFile: file,
          requestedPermission: ObjectPermission.READ,
        });

        if (!canAccess) {
          return res.status(403).json({ error: "접근 권한이 없습니다" });
        }

        await objectStorageService.downloadObject(file, res);
        return;
      }

      // For private objects, authentication and ACL checks are required
      if (!req.session?.userId) {
        return res.status(401).json({ error: "인증이 필요합니다" });
      }

      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // ACL 정책 확인
      const canAccess = await canAccessObject({
        userId: req.session.userId,
        objectFile: objectFile,
        requestedPermission: ObjectPermission.READ,
      });

      if (!canAccess) {
        return res.status(403).json({ error: "접근 권한이 없습니다" });
      }

      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("[Object Storage] Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMessage.includes("timeout") || 
                         errorMessage.includes("network") ||
                         errorMessage.includes("ECONNRESET") ||
                         errorMessage.includes("ENOTFOUND");
      
      return res.status(500).json({ 
        error: "Failed to serve object",
        message: errorMessage,
        retryable: isRetryable,
        suggestion: isRetryable ? "네트워크 연결이 불안정합니다. 잠시 후 다시 시도해주세요." : "서버 오류가 발생했습니다. 관리자에게 문의해주세요."
      });
    }
  });
}


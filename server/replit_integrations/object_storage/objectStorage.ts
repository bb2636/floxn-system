import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// 재시도 설정
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1초
const MAX_RETRY_DELAY_MS = 10000; // 최대 10초

/**
 * 재시도 가능한 에러인지 확인
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || "";
  const errorCode = error.code?.toLowerCase() || "";
  
  // 네트워크 관련 오류
  if (
    errorMessage.includes("timeout") ||
    errorMessage.includes("econnreset") ||
    errorMessage.includes("enotfound") ||
    errorMessage.includes("econnrefused") ||
    errorMessage.includes("network") ||
    errorCode === "timeout" ||
    errorCode === "econnreset" ||
    errorCode === "enotfound" ||
    errorCode === "econnrefused"
  ) {
    return true;
  }
  
  // HTTP 5xx 오류 (서버 오류)
  if (error.status && error.status >= 500 && error.status < 600) {
    return true;
  }
  
  // 특정 Google Cloud Storage 오류 코드
  if (
    errorCode === "unavailable" ||
    errorCode === "deadline_exceeded" ||
    errorCode === "internal" ||
    errorCode === "aborted"
  ) {
    return true;
  }
  
  return false;
}

/**
 * 지수 백오프를 사용한 재시도 유틸리티
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES,
  initialDelayMs: number = INITIAL_RETRY_DELAY_MS
): Promise<T> {
  let lastError: any;
  let delay = initialDelayMs;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // 재시도 불가능한 에러면 즉시 throw
      if (!isRetryableError(error)) {
        console.error(`[Object Storage] ${operationName} failed (non-retryable):`, error);
        throw error;
      }
      
      // 마지막 시도면 throw
      if (attempt === maxRetries) {
        console.error(`[Object Storage] ${operationName} failed after ${maxRetries + 1} attempts:`, error);
        throw error;
      }
      
      // 재시도 로그
      console.warn(
        `[Object Storage] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`,
        error.message || error
      );
      
      // 지수 백오프 대기
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, MAX_RETRY_DELAY_MS);
    }
  }
  
  throw lastError;
}

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() {}

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      // Full path format: /<bucket_name>/<object_name>
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      // Check if file exists with retry
      try {
        const [exists] = await retryWithBackoff(
          () => file.exists(),
          `searchPublicObject.exists(${objectName})`
        );
        if (exists) {
          return file;
        }
      } catch (error) {
        // 파일이 존재하지 않거나 오류 발생 시 다음 경로 시도
        console.warn(`[Object Storage] Failed to check existence for ${objectName}:`, error);
        continue;
      }
    }

    return null;
  }

  // Downloads an object to the response.
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      // Get file metadata with retry
      const [metadata] = await retryWithBackoff(
        () => file.getMetadata(),
        `downloadObject.getMetadata()`
      );
      
      // Get the ACL policy for the object with retry
      const aclPolicy = await retryWithBackoff(
        () => getObjectAclPolicy(file),
        `downloadObject.getObjectAclPolicy()`
      );
      
      const isPublic = aclPolicy?.visibility === "public";
      
      // Set appropriate headers
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${
          isPublic ? "public" : "private"
        }, max-age=${cacheTtlSec}`,
      });

      // Stream the file to the response with retry wrapper
      let streamAttempts = 0;
      const createStream = (): NodeJS.ReadableStream => {
        const stream = file.createReadStream();
        
        stream.on("error", async (err) => {
          console.error(`[Object Storage] Stream error (attempt ${streamAttempts + 1}):`, err);
          
          // 재시도 가능한 에러이고 아직 헤더가 전송되지 않았다면 재시도
          if (isRetryableError(err) && !res.headersSent && streamAttempts < MAX_RETRIES) {
            streamAttempts++;
            const delay = Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(2, streamAttempts - 1), MAX_RETRY_DELAY_MS);
            console.warn(`[Object Storage] Retrying stream in ${delay}ms...`);
            
            setTimeout(() => {
              try {
                const retryStream = createStream();
                retryStream.pipe(res);
              } catch (retryError) {
                console.error("[Object Storage] Stream retry failed:", retryError);
                if (!res.headersSent) {
                  res.status(500).json({ error: "Error streaming file after retries" });
                }
              }
            }, delay);
          } else {
            if (!res.headersSent) {
              res.status(500).json({ error: "Error streaming file" });
            }
          }
        });
        
        return stream;
      };
      
      const stream = createStream();
      stream.pipe(res);
    } catch (error) {
      console.error("[Object Storage] Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Error downloading file",
          retryable: isRetryableError(error),
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    // Sign URL for PUT method with TTL (with retry)
    return retryWithBackoff(
      () => signObjectURL({
        bucketName,
        objectName,
        method: "PUT",
        ttlSec: 900,
      }),
      `getObjectEntityUploadURL(${objectName})`
    );
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    
    // Check if file exists with retry
    const [exists] = await retryWithBackoff(
      () => objectFile.exists(),
      `getObjectEntityFile.exists(${objectName})`
    );
    
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(
    rawPath: string,
  ): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
  
    // Extract the path from the URL by removing query parameters and domain
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
  
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
  
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
  
    // Extract the entity ID from the path
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  // Object Storage에서 파일을 Buffer로 다운로드
  async downloadToBuffer(storageKey: string): Promise<Buffer> {
    const { bucketName, objectName } = parseObjectPath(storageKey);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    // Check if file exists with retry
    const [exists] = await retryWithBackoff(
      () => file.exists(),
      `downloadToBuffer.exists(${objectName})`
    );
    
    if (!exists) {
      throw new ObjectNotFoundError();
    }

    // Download file with retry
    const [contents] = await retryWithBackoff(
      () => file.download(),
      `downloadToBuffer.download(${objectName})`
    );
    
    return contents;
  }

  // Object Storage에서 파일 다운로드용 signed URL 생성
  async getDownloadURL(storageKey: string, ttlSec: number = 3600): Promise<string> {
    const { bucketName, objectName } = parseObjectPath(storageKey);
    return retryWithBackoff(
      () => signObjectURL({
        bucketName,
        objectName,
        method: "GET",
        ttlSec,
      }),
      `getDownloadURL(${objectName})`
    );
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

export async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  return retryWithBackoff(
    async () => {
      const request = {
        bucket_name: bucketName,
        object_name: objectName,
        method,
        expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
      };
      
      // 타임아웃 설정 (30초) - AbortController 사용
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch(
          `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
            signal: controller.signal,
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const error: any = new Error(
            `Failed to sign object URL, errorcode: ${response.status}, ` +
              `make sure you're running on Replit`
          );
          error.status = response.status;
          throw error;
        }

        const { signed_url: signedURL } = await response.json();
        return signedURL;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          const timeoutError: any = new Error('Request timeout after 30 seconds');
          timeoutError.code = 'timeout';
          throw timeoutError;
        }
        throw error;
      }
    },
    `signObjectURL(${bucketName}/${objectName})`
  );
}


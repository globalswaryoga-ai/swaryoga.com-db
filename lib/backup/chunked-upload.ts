/**
 * =====================================================
 * CHUNKED UPLOAD/DOWNLOAD SERVICE
 * =====================================================
 * Splits large files into chunks for faster transfer
 * Parallel chunk handling for speed optimization
 * =====================================================
 */

import crypto from 'crypto';
import { logger } from './logger';

interface ChunkMetadata {
  fileId: string;
  totalChunks: number;
  chunkSize: number;
  fileSize: number;
  checksums: Map<number, string>;
  uploadedChunks: Set<number>;
  completedAt?: Date;
}

export class ChunkedUploadService {
  private uploads: Map<string, ChunkMetadata> = new Map();
  private CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk
  private MAX_PARALLEL_CHUNKS = 3;

  /**
   * Initialize chunked upload
   */
  initializeUpload(fileData: Buffer): { fileId: string; totalChunks: number; chunkSize: number } {
    const fileId = crypto.randomBytes(8).toString('hex');
    const totalChunks = Math.ceil(fileData.length / this.CHUNK_SIZE);

    const metadata: ChunkMetadata = {
      fileId,
      totalChunks,
      chunkSize: this.CHUNK_SIZE,
      fileSize: fileData.length,
      checksums: new Map(),
      uploadedChunks: new Set(),
    };

    this.uploads.set(fileId, metadata);

    logger.info(`✅ Initialized chunked upload: ${fileId}`, {
      totalChunks,
      fileSize: Math.round(fileData.length / 1024 / 1024),
    });

    return { fileId, totalChunks, chunkSize: this.CHUNK_SIZE };
  }

  /**
   * Split file into chunks
   */
  splitIntoChunks(fileData: Buffer): Array<{ chunkIndex: number; data: Buffer; checksum: string }> {
    const chunks: Array<{ chunkIndex: number; data: Buffer; checksum: string }> = [];

    for (let i = 0; i < fileData.length; i += this.CHUNK_SIZE) {
      const chunkIndex = Math.floor(i / this.CHUNK_SIZE);
      const start = i;
      const end = Math.min(i + this.CHUNK_SIZE, fileData.length);
      const chunkData = fileData.slice(start, end);

      const checksum = crypto.createHash('sha256').update(chunkData).digest('hex');

      chunks.push({
        chunkIndex,
        data: chunkData,
        checksum,
      });
    }

    return chunks;
  }

  /**
   * Upload chunk
   */
  async uploadChunk(
    fileId: string,
    chunkIndex: number,
    chunkData: Buffer,
    bunnyUploadFn: (path: string, data: Buffer) => Promise<void>
  ): Promise<boolean> {
    try {
      const metadata = this.uploads.get(fileId);
      if (!metadata) {
        throw new Error(`Upload ${fileId} not found`);
      }

      const checksum = crypto.createHash('sha256').update(chunkData).digest('hex');
      const chunkPath = `/uploads/${fileId}/chunk-${chunkIndex}.bin`;

      await bunnyUploadFn(chunkPath, chunkData);

      metadata.checksums.set(chunkIndex, checksum);
      metadata.uploadedChunks.add(chunkIndex);

      const progress = Math.round((metadata.uploadedChunks.size / metadata.totalChunks) * 100);
      logger.info(
        `✅ Chunk ${chunkIndex + 1}/${metadata.totalChunks} uploaded (${progress}% complete)`,
        { fileId, checksum }
      );

      return true;
    } catch (error) {
      logger.error(`Error uploading chunk ${chunkIndex}`, { fileId, error: error.message });
      return false;
    }
  }

  /**
   * Parallel chunk upload
   */
  async uploadChunksParallel(
    fileData: Buffer,
    bunnyUploadFn: (path: string, data: Buffer) => Promise<void>
  ): Promise<{ fileId: string; chunks: number; duration: number }> {
    const startTime = Date.now();
    const { fileId, totalChunks } = this.initializeUpload(fileData);
    const chunks = this.splitIntoChunks(fileData);

    // Upload chunks in parallel batches
    for (let i = 0; i < chunks.length; i += this.MAX_PARALLEL_CHUNKS) {
      const batch = chunks.slice(i, i + this.MAX_PARALLEL_CHUNKS);
      const promises = batch.map((chunk) =>
        this.uploadChunk(fileId, chunk.chunkIndex, chunk.data, bunnyUploadFn)
      );

      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r).length;

      if (failed > 0) {
        logger.warn(`⚠️  ${failed} chunks failed in batch, retrying...`);
        // Retry failed chunks
        for (const chunk of batch) {
          const metadata = this.uploads.get(fileId)!;
          if (!metadata.uploadedChunks.has(chunk.chunkIndex)) {
            await this.uploadChunk(fileId, chunk.chunkIndex, chunk.data, bunnyUploadFn);
          }
        }
      }
    }

    const metadata = this.uploads.get(fileId)!;
    metadata.completedAt = new Date();

    const duration = Date.now() - startTime;
    logger.info(`✅ All chunks uploaded in ${Math.round(duration / 1000)}s`, {
      fileId,
      chunks: totalChunks,
    });

    return { fileId, chunks: totalChunks, duration };
  }

  /**
   * Download and assemble chunks
   */
  async downloadChunksParallel(
    fileId: string,
    totalChunks: number,
    bunnyDownloadFn: (path: string) => Promise<Buffer>
  ): Promise<Buffer> {
    const startTime = Date.now();
    const chunks: Map<number, Buffer> = new Map();

    logger.info(`📥 Starting parallel download of ${totalChunks} chunks`, { fileId });

    // Download chunks in parallel batches
    for (let i = 0; i < totalChunks; i += this.MAX_PARALLEL_CHUNKS) {
      const batchIndices = Array.from(
        { length: Math.min(this.MAX_PARALLEL_CHUNKS, totalChunks - i) },
        (_, idx) => i + idx
      );

      const promises = batchIndices.map(async (chunkIndex) => {
        try {
          const chunkPath = `/uploads/${fileId}/chunk-${chunkIndex}.bin`;
          const chunkData = await bunnyDownloadFn(chunkPath);
          chunks.set(chunkIndex, chunkData);
          logger.info(
            `✅ Downloaded chunk ${chunkIndex + 1}/${totalChunks} (${Math.round(chunkData.length / 1024)}KB)`
          );
        } catch (error) {
          logger.error(`Error downloading chunk ${chunkIndex}`, { fileId, error: error.message });
          throw error;
        }
      });

      await Promise.all(promises);
    }

    // Assemble chunks in order
    const buffers: Buffer[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunk = chunks.get(i);
      if (!chunk) {
        throw new Error(`Missing chunk ${i}`);
      }
      buffers.push(chunk);
    }

    const assembled = Buffer.concat(buffers);
    const duration = Date.now() - startTime;

    logger.info(`✅ All chunks downloaded and assembled in ${Math.round(duration / 1000)}s`, {
      fileId,
      totalSize: Math.round(assembled.length / 1024 / 1024),
    });

    return assembled;
  }

  /**
   * Get upload status
   */
  getUploadStatus(fileId: string): {
    fileId: string;
    progress: number;
    uploadedChunks: number;
    totalChunks: number;
  } | null {
    const metadata = this.uploads.get(fileId);
    if (!metadata) return null;

    return {
      fileId,
      progress: Math.round((metadata.uploadedChunks.size / metadata.totalChunks) * 100),
      uploadedChunks: metadata.uploadedChunks.size,
      totalChunks: metadata.totalChunks,
    };
  }

  /**
   * Clean up upload session
   */
  cleanupUpload(fileId: string): void {
    this.uploads.delete(fileId);
    logger.info(`🧹 Cleaned up upload session: ${fileId}`);
  }

  /**
   * Calculate optimal chunk size based on file size
   */
  calculateOptimalChunkSize(fileSize: number): number {
    // For very large files, use bigger chunks
    if (fileSize > 1000 * 1024 * 1024) {
      // > 1GB: 50MB chunks
      return 50 * 1024 * 1024;
    } else if (fileSize > 100 * 1024 * 1024) {
      // > 100MB: 10MB chunks
      return 10 * 1024 * 1024;
    } else {
      // < 100MB: 5MB chunks
      return 5 * 1024 * 1024;
    }
  }
}

export default ChunkedUploadService;

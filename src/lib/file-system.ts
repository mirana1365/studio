// src/lib/file-system.ts
import fs from 'fs/promises';
import path from 'path';
import { statSync, createReadStream } from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
(async () => {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
})();

export async function saveFile(file: File, fileName: string): Promise<{ filePath: string; serverPath: string; error?: string }> {
  try {
    // Sanitize filename to prevent directory traversal and invalid characters
    const sanitizedFileName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!sanitizedFileName) {
      return { filePath: '', serverPath: '', error: 'Invalid filename after sanitization.' };
    }
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const serverPath = path.join(UPLOAD_DIR, sanitizedFileName);
    await fs.writeFile(serverPath, buffer);
    
    // Return web-accessible path
    const filePath = `/uploads/${sanitizedFileName}`;
    return { filePath, serverPath };
  } catch (e: any) {
    console.error('Error saving file:', e);
    return { filePath: '', serverPath: '', error: e.message || 'Failed to save file.' };
  }
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string; // MIME type
  url: string;
  lastModified: number;
}

export async function getUploadedFiles(): Promise<UploadedFile[]> {
  try {
    const fileNames = await fs.readdir(UPLOAD_DIR);
    const filesDetails = await Promise.all(
      fileNames.map(async (name) => {
        const filePath = path.join(UPLOAD_DIR, name);
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
             // Basic MIME type detection based on extension (can be improved)
            let type = 'application/octet-stream';
            const ext = path.extname(name).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) type = `image/${ext.substring(1)}`;
            if (['.mp4', '.webm', '.ogv'].includes(ext)) type = `video/${ext.substring(1)}`;
            if (ext === '.pdf') type = 'application/pdf';
            
            return {
              name,
              size: stats.size,
              type, 
              url: `/uploads/${name}`,
              lastModified: stats.mtimeMs,
            };
          }
        } catch (statError) {
          console.error(`Failed to stat file ${name}:`, statError);
          return null; // Skip files that can't be stat'd (e.g. .gitkeep)
        }
        return null;
      })
    );
    return filesDetails.filter(file => file !== null) as UploadedFile[];
  } catch (e: any) {
    console.error('Error getting uploaded files:', e);
    if (e.code === 'ENOENT') { // If uploads directory doesn't exist
      return [];
    }
    throw e; // Re-throw other errors
  }
}

export async function renameUploadedFile(oldName: string, newName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sanitizedOldName = path.basename(oldName);
    const sanitizedNewName = path.basename(newName).replace(/[^a-zA-Z0-9._-]/g, '_');

    if (!sanitizedNewName) {
      return { success: false, error: 'Invalid new filename after sanitization.' };
    }

    const oldPath = path.join(UPLOAD_DIR, sanitizedOldName);
    const newPath = path.join(UPLOAD_DIR, sanitizedNewName);

    if (oldPath === newPath) return { success: true }; // No change needed

    await fs.rename(oldPath, newPath);
    return { success: true };
  } catch (e: any) {
    console.error('Error renaming file:', e);
    return { success: false, error: e.message || 'Failed to rename file.' };
  }
}

export async function deleteUploadedFile(fileName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sanitizedFileName = path.basename(fileName);
    const filePath = path.join(UPLOAD_DIR, sanitizedFileName);
    await fs.unlink(filePath);
    return { success: true };
  } catch (e: any) {
    console.error('Error deleting file:', e);
    return { success: false, error: e.message || 'Failed to delete file.' };
  }
}

export function getFileStream(fileName: string) {
  const sanitizedFileName = path.basename(fileName);
  const filePath = path.join(UPLOAD_DIR, sanitizedFileName);
  try {
    // Check if file exists before creating stream
    statSync(filePath);
    return createReadStream(filePath);
  } catch (error) {
    console.error("Error accessing file for stream:", error);
    return null;
  }
}

export function getFileSize(fileName: string): number {
  const sanitizedFileName = path.basename(fileName);
  const filePath = path.join(UPLOAD_DIR, sanitizedFileName);
  try {
    const stats = statSync(filePath);
    return stats.size;
  } catch (error) {
    console.error("Error getting file size:", error);
    return 0;
  }
}

// src/app/actions/fileActions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveFile as saveFileUtil, getUploadedFiles as getUploadedFilesUtil, renameUploadedFile as renameFileUtil, deleteUploadedFile as deleteFileUtil, type UploadedFile } from "@/lib/file-system";
import { suggestFilename as suggestFilenameFlow, type SuggestFilenameInput } from "@/ai/flows/suggest-filename";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_FILE_TYPES = ["image/", "video/"]; // Prefixes for MIME types

const fileSchema = z.instanceof(File).refine(
  (file) => file.size <= MAX_FILE_SIZE,
  `File size should be less than ${MAX_FILE_SIZE / (1024*1024)}MB.`
).refine(
  (file) => ALLOWED_FILE_TYPES.some(type => file.type.startsWith(type)),
  "Only image and video files are allowed."
);

const uploadSchema = z.object({
  file: fileSchema,
  customFilename: z.string().min(1, "Filename cannot be empty.").max(200, "Filename too long."),
  description: z.string().optional(), // Description is optional for upload, required for AI suggestion
});

export async function uploadFile(formData: FormData): Promise<{ success: boolean; message: string; filePath?: string }> {
  const file = formData.get("file") as File | null;
  const customFilename = formData.get("customFilename") as string | null;
  const description = formData.get("description") as string | null;

  const parsed = uploadSchema.safeParse({
    file,
    customFilename: customFilename || file?.name || 'untitled',
    description: description || '',
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.errors.map(e => e.message).join(", ") };
  }

  const { file: validatedFile, customFilename: validatedFilename } = parsed.data;
  
  // Ensure filename has an extension
  let finalFilename = validatedFilename;
  const originalExt = validatedFile.name.includes('.') ? validatedFile.name.substring(validatedFile.name.lastIndexOf('.')) : '';
  if (!finalFilename.includes('.') && originalExt) {
    finalFilename += originalExt;
  } else if (!finalFilename.includes('.')) {
    // Fallback if original has no extension, try to guess from MIME or default
    const mimeParts = validatedFile.type.split('/');
    if (mimeParts.length === 2 && mimeParts[1] !== '*') {
        finalFilename += `.${mimeParts[1]}`;
    } else {
        finalFilename += '.dat'; // Default extension
    }
  }


  const { filePath, error } = await saveFileUtil(validatedFile, finalFilename);

  if (error) {
    return { success: false, message: error };
  }

  revalidatePath("/"); // Revalidate main page if needed
  revalidatePath("/taupload"); // Revalidate admin page
  return { success: true, message: "File uploaded successfully!", filePath };
}

export async function getFiles(): Promise<UploadedFile[]> {
  return getUploadedFilesUtil();
}

const renameSchema = z.object({
  oldName: z.string().min(1),
  newName: z.string().min(1, "New filename cannot be empty.").max(200, "New filename too long."),
});
export async function renameUploadedFile(oldName: string, newName: string): Promise<{ success: boolean; message: string }> {
  const parsed = renameSchema.safeParse({ oldName, newName });
  if(!parsed.success) {
    return { success: false, message: parsed.error.errors.map(e => e.message).join(", ") };
  }
  
  // Ensure newName has an extension if oldName had one
  let finalNewName = parsed.data.newName;
  const oldExt = parsed.data.oldName.includes('.') ? parsed.data.oldName.substring(parsed.data.oldName.lastIndexOf('.')) : '';
  if (oldExt && !finalNewName.toLowerCase().endsWith(oldExt.toLowerCase())) {
     if (finalNewName.includes('.')) { // if user provided a different extension
        // keep it
     } else { // if user provided no extension
        finalNewName += oldExt;
     }
  }


  const { success, error } = await renameFileUtil(parsed.data.oldName, finalNewName);
  if (success) {
    revalidatePath("/taupload");
    return { success: true, message: "File renamed successfully." };
  }
  return { success: false, message: error || "Failed to rename file." };
}

export async function deleteUploadedFile(fileName: string): Promise<{ success: boolean; message: string }> {
  if (!fileName) return { success: false, message: "Filename cannot be empty." };
  const { success, error } = await deleteFileUtil(fileName);
  if (success) {
    revalidatePath("/taupload");
    return { success: true, message: "File deleted successfully." };
  }
  return { success: false, message: error || "Failed to delete file." };
}

const suggestSchema = z.object({
  fileDataUri: z.string().startsWith("data:"),
  description: z.string().min(1, "Description cannot be empty.").max(500, "Description too long."),
});
export async function suggestNameAction(fileDataUri: string, description: string): Promise<{ success: boolean; suggestion?: string; message?: string }> {
  const parsed = suggestSchema.safeParse({ fileDataUri, description });
  if(!parsed.success) {
    return { success: false, message: parsed.error.errors.map(e => e.message).join(", ") };
  }
  
  try {
    const input: SuggestFilenameInput = {
      fileDataUri: parsed.data.fileDataUri,
      description: parsed.data.description,
    };
    const result = await suggestFilenameFlow(input);
    if (result.suggestedFilename) {
      return { success: true, suggestion: result.suggestedFilename };
    }
    return { success: false, message: "AI could not suggest a filename." };
  } catch (error: any) {
    console.error("AI suggestion error:", error);
    return { success: false, message: error.message || "Failed to get AI suggestion." };
  }
}

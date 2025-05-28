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
  `اندازه فایل باید کمتر از ${MAX_FILE_SIZE / (1024*1024)} مگابایت باشد.`
).refine(
  (file) => ALLOWED_FILE_TYPES.some(type => file.type.startsWith(type)),
  "فقط فایل‌های تصویری و ویدیویی مجاز هستند."
);

const uploadSchema = z.object({
  file: fileSchema,
  customFilename: z.string().min(1, "نام فایل نمی‌تواند خالی باشد.").max(200, "نام فایل خیلی طولانی است."),
  description: z.string().optional(), 
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
  
  let finalFilename = validatedFilename;
  const originalExt = validatedFile.name.includes('.') ? validatedFile.name.substring(validatedFile.name.lastIndexOf('.')) : '';
  if (!finalFilename.includes('.') && originalExt) {
    finalFilename += originalExt;
  } else if (!finalFilename.includes('.')) {
    const mimeParts = validatedFile.type.split('/');
    if (mimeParts.length === 2 && mimeParts[1] !== '*') {
        finalFilename += `.${mimeParts[1]}`;
    } else {
        finalFilename += '.dat'; 
    }
  }


  const { filePath, error } = await saveFileUtil(validatedFile, finalFilename);

  if (error) {
    return { success: false, message: error === 'Invalid filename after sanitization.' ? 'نام فایل پس از پاکسازی نامعتبر است.' : error || "ذخیره فایل ناموفق بود." };
  }

  revalidatePath("/"); 
  revalidatePath("/taupload"); 
  return { success: true, message: "فایل با موفقیت بارگذاری شد!", filePath };
}

export async function getFiles(): Promise<UploadedFile[]> {
  return getUploadedFilesUtil();
}

const renameSchema = z.object({
  oldName: z.string().min(1),
  newName: z.string().min(1, "نام فایل جدید نمی‌تواند خالی باشد.").max(200, "نام فایل جدید خیلی طولانی است."),
});
export async function renameUploadedFile(oldName: string, newName: string): Promise<{ success: boolean; message: string }> {
  const parsed = renameSchema.safeParse({ oldName, newName });
  if(!parsed.success) {
    return { success: false, message: parsed.error.errors.map(e => e.message).join(", ") };
  }
  
  let finalNewName = parsed.data.newName;
  const oldExt = parsed.data.oldName.includes('.') ? parsed.data.oldName.substring(parsed.data.oldName.lastIndexOf('.')) : '';
  if (oldExt && !finalNewName.toLowerCase().endsWith(oldExt.toLowerCase())) {
     if (finalNewName.includes('.')) { 
     } else { 
        finalNewName += oldExt;
     }
  }


  const { success, error } = await renameFileUtil(parsed.data.oldName, finalNewName);
  if (success) {
    revalidatePath("/taupload");
    return { success: true, message: "نام فایل با موفقیت تغییر کرد." };
  }
  return { success: false, message: error === 'Invalid new filename after sanitization.' ? 'نام فایل جدید پس از پاکسازی نامعتبر است.' : error || "تغییر نام فایل ناموفق بود." };
}

export async function deleteUploadedFile(fileName: string): Promise<{ success: boolean; message: string }> {
  if (!fileName) return { success: false, message: "نام فایل نمی‌تواند خالی باشد." };
  const { success, error } = await deleteFileUtil(fileName);
  if (success) {
    revalidatePath("/taupload");
    return { success: true, message: "فایل با موفقیت حذف شد." };
  }
  return { success: false, message: error || "حذف فایل ناموفق بود." };
}

const suggestSchema = z.object({
  fileDataUri: z.string().startsWith("data:"),
  description: z.string().min(1, "توضیحات نمی‌تواند خالی باشد.").max(500, "توضیحات خیلی طولانی است."),
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
    return { success: false, message: "هوش مصنوعی نتوانست نام فایلی پیشنهاد دهد." };
  } catch (error: any) {
    console.error("AI suggestion error:", error);
    return { success: false, message: error.message || "دریافت پیشنهاد از هوش مصنوعی ناموفق بود." };
  }
}

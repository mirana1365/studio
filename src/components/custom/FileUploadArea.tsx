// src/components/custom/FileUploadArea.tsx
"use client";

import { useState, useCallback, type ChangeEvent, type DragEvent, useRef } from 'react';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UploadCloud, Wand2, Loader2, FileCheck2, FileWarning } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { uploadFile, suggestNameAction } from "@/app/actions/fileActions";
import { FilePreview } from "./FilePreview";

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const formSchema = z.object({
  file: z.custom<File | null>((val) => val instanceof File, "لطفا یک فایل انتخاب کنید.")
    .refine((file) => file && file.size <= MAX_FILE_SIZE_BYTES, `اندازه فایل باید ${MAX_FILE_SIZE_MB} مگابایت یا کمتر باشد.`)
    .refine((file) => file && (file.type.startsWith("image/") || file.type.startsWith("video/")), "فقط فایل‌های تصویری یا ویدیویی مجاز هستند."),
  customFilename: z.string().min(1, "نام فایل الزامی است.").max(200, "نام فایل خیلی طولانی است (حداکثر ۲۰۰ کاراکتر).")
    .regex(/^[a-zA-Z0-9._\s-]+$/, "نام فایل شامل کاراکترهای نامعتبر است."),
  description: z.string().max(500, "توضیحات خیلی طولانی است (حداکثر ۵۰۰ کاراکتر).").optional(),
});

type UploadFormValues = z.infer<typeof formSchema>;

export function FileUploadArea() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      file: null,
      customFilename: "",
      description: "",
    },
  });

  const handleFileChange = (file: File | null) => {
    if (file) {
      setSelectedFile(file);
      form.setValue("file", file, { shouldValidate: true });
      form.setValue("customFilename", file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
      form.clearErrors("file");
    } else {
      setSelectedFile(null);
      form.setValue("file", null);
    }
  };

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    handleFileChange(file);
  };

  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0] || null;
    handleFileChange(file);
  }, []);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const onSubmit: SubmitHandler<UploadFormValues> = async (data) => {
    if (!data.file) {
      toast({ variant: "destructive", title: "هیچ فایلی انتخاب نشده است", description: "لطفا یک فایل برای بارگذاری انتخاب کنید." });
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("customFilename", data.customFilename);
    if (data.description) {
      formData.append("description", data.description);
    }

    try {
      const result = await uploadFile(formData);
      if (result.success) {
        toast({
          variant: "default",
          title: "بارگذاری موفقیت آمیز بود",
          description: result.message,
          action: <FileCheck2 className="text-green-500" />,
        });
        form.reset();
        setSelectedFile(null);
      } else {
        toast({
          variant: "destructive",
          title: "بارگذاری ناموفق بود",
          description: result.message,
          action: <FileWarning className="text-red-500" />,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطا در بارگذاری",
        description: "یک خطای غیرمنتظره رخ داد.",
        action: <FileWarning className="text-red-500" />,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSuggestFilename = async () => {
    const file = form.getValues("file");
    const description = form.getValues("description");

    if (!file) {
      toast({ variant: "destructive", title: "امکان پیشنهاد وجود ندارد", description: "لطفا ابتدا یک فایل انتخاب کنید." });
      return;
    }
    if (!description?.trim()) {
      toast({ variant: "destructive", title: "امکان پیشنهاد وجود ندارد", description: "لطفا توضیحی برای فایل ارائه دهید." });
      form.setError("description", { type: "manual", message: "توضیحات برای پیشنهاد هوش مصنوعی الزامی است." });
      return;
    }
    
    setIsSuggesting(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const fileDataUri = reader.result as string;
        const result = await suggestNameAction(fileDataUri, description);
        if (result.success && result.suggestion) {
          // Preserve original extension if AI suggestion doesn't include one
          const originalExt = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
          let suggestedName = result.suggestion;
          if (!suggestedName.includes('.') && originalExt) {
            suggestedName += originalExt;
          }
          form.setValue("customFilename", suggestedName);
          toast({ title: "پیشنهاد اعمال شد", description: "هوش مصنوعی نام فایل جدیدی پیشنهاد داد." });
        } else {
          toast({ variant: "destructive", title: "پیشنهاد ناموفق بود", description: result.message });
        }
        setIsSuggesting(false);
      };
      reader.onerror = () => {
         toast({ variant: "destructive", title: "خطا در خواندن فایل", description: "فایل برای پیشنهاد هوش مصنوعی خوانده نشد." });
         setIsSuggesting(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({ variant: "destructive", title: "خطا در پیشنهاد", description: "یک خطای غیرمنتظره در طول پیشنهاد رخ داد." });
      setIsSuggesting(false);
    }
  };
  
  const fileError = form.formState.errors.file?.message;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-center">عکس یا ویدیوی خود را بارگذاری کنید</CardTitle>
        <CardDescription className="text-center">
          یک فایل را بکشید و رها کنید یا برای انتخاب کلیک کنید. یک نام سفارشی و توضیحات اختیاری ارائه دهید.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="file"
              render={() => ( 
                <FormItem>
                  <FormLabel>فایل</FormLabel>
                  <FormControl>
                    <div
                      onDrop={onDrop}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer 
                        bg-muted/50 hover:bg-muted/70 transition-colors
                        ${isDragging ? 'border-primary' : 'border-border'}
                        ${fileError ? 'border-destructive' : ''}`}
                    >
                      <UploadCloud className={`w-10 h-10 mb-3 ${fileError ? 'text-destructive' : 'text-muted-foreground'}`} />
                      <p className={`mb-2 text-sm ${fileError ? 'text-destructive' : 'text-muted-foreground'}`}>
                        <span className="font-semibold">برای بارگذاری کلیک کنید</span> یا بکشید و رها کنید
                      </p>
                      <p className={`text-xs ${fileError ? 'text-destructive' : 'text-muted-foreground'}`}>
                        تصاویر یا ویدیوها (حداکثر ${MAX_FILE_SIZE_MB} مگابایت)
                      </p>
                      <Input
                        ref={fileInputRef}
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept="image/*,video/*"
                        onChange={onFileSelected}
                        aria-describedby="file-error-message"
                      />
                    </div>
                  </FormControl>
                  {fileError && <FormMessage id="file-error-message">{fileError}</FormMessage>}
                </FormItem>
              )}
            />

            {selectedFile && <FilePreview file={selectedFile} />}

            <FormField
              control={form.control}
              name="customFilename"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="customFilename">نام فایل سفارشی (بدون پسوند)</FormLabel>
                  <FormControl>
                    <Input id="customFilename" placeholder="مثال: عکس تعطیلات عالی من" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="description">توضیحات (برای پیشنهاد هوش مصنوعی)</FormLabel>
                  <FormControl>
                    <Textarea id="description" placeholder="مثال: غروب زیبای خورشید بر فراز کوه‌ها" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSuggestFilename}
                disabled={isSuggesting || isUploading || !selectedFile || !form.watch("description")}
                className="w-full sm:w-auto"
              >
                {isSuggesting ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="ml-2 h-4 w-4" />
                )}
                پیشنهاد نام فایل
              </Button>
              <Button type="submit" disabled={isUploading || isSuggesting || !selectedFile} className="w-full sm:flex-1 bg-accent hover:bg-accent/90">
                {isUploading ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="ml-2 h-4 w-4" />
                )}
                بارگذاری فایل
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

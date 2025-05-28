// src/components/custom/FileUploadArea.tsx
"use client";

import { useState, useCallback, type ChangeEvent, type DragEvent } from 'react';
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
  file: z.custom<File | null>((val) => val instanceof File, "Please select a file.")
    .refine((file) => file && file.size <= MAX_FILE_SIZE_BYTES, `File size must be ${MAX_FILE_SIZE_MB}MB or less.`)
    .refine((file) => file && (file.type.startsWith("image/") || file.type.startsWith("video/")), "Only image or video files are allowed."),
  customFilename: z.string().min(1, "Filename is required.").max(200, "Filename is too long (max 200 chars).")
    .regex(/^[a-zA-Z0-9._\s-]+$/, "Filename contains invalid characters."),
  description: z.string().max(500, "Description is too long (max 500 chars).").optional(),
});

type UploadFormValues = z.infer<typeof formSchema>;

export function FileUploadArea() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();

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
      toast({ variant: "destructive", title: "No file selected", description: "Please select a file to upload." });
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
          title: "Upload Successful",
          description: result.message,
          action: <FileCheck2 className="text-green-500" />,
        });
        form.reset();
        setSelectedFile(null);
      } else {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: result.message,
          action: <FileWarning className="text-red-500" />,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: "An unexpected error occurred.",
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
      toast({ variant: "destructive", title: "Cannot Suggest", description: "Please select a file first." });
      return;
    }
    if (!description?.trim()) {
      toast({ variant: "destructive", title: "Cannot Suggest", description: "Please provide a description for the file." });
      form.setError("description", { type: "manual", message: "Description is required for AI suggestion." });
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
          toast({ title: "Suggestion Applied", description: "AI suggested a new filename." });
        } else {
          toast({ variant: "destructive", title: "Suggestion Failed", description: result.message });
        }
        setIsSuggesting(false);
      };
      reader.onerror = () => {
         toast({ variant: "destructive", title: "Error Reading File", description: "Could not read file for AI suggestion." });
         setIsSuggesting(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({ variant: "destructive", title: "Suggestion Error", description: "An unexpected error occurred during suggestion." });
      setIsSuggesting(false);
    }
  };
  
  const fileError = form.formState.errors.file?.message;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Upload Your Photo or Video</CardTitle>
        <CardDescription className="text-center">
          Drag and drop a file or click to select. Provide a custom name and an optional description.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="file"
              render={() => ( // Field is controlled by custom logic, RHF tracks value/errors
                <FormItem>
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <div
                      onDrop={onDrop}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer 
                        bg-muted/50 hover:bg-muted/70 transition-colors
                        ${isDragging ? 'border-primary' : 'border-border'}
                        ${fileError ? 'border-destructive' : ''}`}
                    >
                      <UploadCloud className={`w-10 h-10 mb-3 ${fileError ? 'text-destructive' : 'text-muted-foreground'}`} />
                      <p className={`mb-2 text-sm ${fileError ? 'text-destructive' : 'text-muted-foreground'}`}>
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className={`text-xs ${fileError ? 'text-destructive' : 'text-muted-foreground'}`}>
                        Images or Videos (MAX. ${MAX_FILE_SIZE_MB}MB)
                      </p>
                      <Input
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
                  <FormLabel htmlFor="customFilename">Custom Filename (without extension)</FormLabel>
                  <FormControl>
                    <Input id="customFilename" placeholder="e.g., My Awesome Vacation Photo" {...field} />
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
                  <FormLabel htmlFor="description">Description (for AI suggestion)</FormLabel>
                  <FormControl>
                    <Textarea id="description" placeholder="e.g., A beautiful sunset over the mountains" {...field} />
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Suggest Filename
              </Button>
              <Button type="submit" disabled={isUploading || isSuggesting || !selectedFile} className="w-full sm:flex-1 bg-accent hover:bg-accent/90">
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                Upload File
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

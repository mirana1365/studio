// src/components/custom/FilePreview.tsx
"use client";

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from './LoadingSpinner';
import { AlertTriangle, Film, File as FileIcon } from 'lucide-react';

interface FilePreviewProps {
  file: File | null;
}

export function FilePreview({ file }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setFileType(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileType(file.type);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
        setIsLoading(false);
      };
      reader.onerror = () => {
        setError('Failed to read image file.');
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      // For videos, we can use Object URL for preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setIsLoading(false);
      // It's important to revoke the object URL when the component unmounts or file changes
      return () => URL.revokeObjectURL(url);
    } else {
      // For other file types, no direct preview
      setPreviewUrl(null);
      setIsLoading(false);
    }
  }, [file]);

  if (!file) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="mt-4 w-full max-w-md mx-auto shadow-md">
        <CardContent className="p-6 flex flex-col items-center justify-center h-48">
          <LoadingSpinner />
          <p className="mt-2 text-muted-foreground">Loading preview...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-4 w-full max-w-md mx-auto border-destructive shadow-md">
        <CardContent className="p-6 flex flex-col items-center justify-center h-48">
          <AlertTriangle className="w-10 h-10 text-destructive mb-2" />
          <p className="text-destructive-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mt-6 w-full max-w-lg mx-auto shadow-lg overflow-hidden">
      <CardContent className="p-0">
        {fileType?.startsWith('image/') && previewUrl && (
          <div className="relative w-full aspect-video">
            <Image src={previewUrl} alt="File preview" layout="fill" objectFit="contain" data-ai-hint="abstract photo" />
          </div>
        )}
        {fileType?.startsWith('video/') && previewUrl && (
          <video controls src={previewUrl} className="w-full aspect-video" data-ai-hint="video player" />
        )}
        {!fileType?.startsWith('image/') && !fileType?.startsWith('video/') && (
          <div className="p-6 flex flex-col items-center justify-center h-48 bg-muted/50">
            {fileType?.startsWith('video/') ? <Film className="w-16 h-16 text-muted-foreground mb-2" /> : <FileIcon className="w-16 h-16 text-muted-foreground mb-2" />}
            <p className="text-sm text-muted-foreground font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">({(file.size / (1024*1024)).toFixed(2)} MB)</p>
            <p className="text-xs text-muted-foreground mt-1">No preview available for this file type.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

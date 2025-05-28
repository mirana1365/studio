// src/components/admin/AdminDashboard.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logout } from "@/app/actions/authActions";
import { getFiles } from "@/app/actions/fileActions";
import type { UploadedFile } from "@/lib/file-system";
import { FileListItem } from "./FileListItem";
import { LoadingSpinner } from '../custom/LoadingSpinner';
import { LogOut, RefreshCw, Inbox } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminDashboardProps {
  onLogout: () => void;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const fetchedFiles = await getFiles();
      // Sort files by modification date, newest first
      fetchedFiles.sort((a, b) => b.lastModified - a.lastModified);
      setFiles(fetchedFiles);
    } catch (error) {
      toast({ variant: "destructive", title: "خطا در دریافت فایل‌ها", description: "لیست فایل‌ها بارگذاری نشد." });
      setFiles([]); // Clear files on error
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleLogout = async () => {
    await logout();
    toast({ title: "خروج از سیستم انجام شد", description: "شما با موفقیت از سیستم خارج شدید." });
    onLogout();
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-primary">داشبورد مدیریت</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchFiles} disabled={isRefreshing} aria-label="بازخوانی لیست فایل‌ها">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="ml-2 hidden sm:inline">{isRefreshing ? 'در حال بازخوانی...' : 'بازخوانی'}</span>
          </Button>
          <Button onClick={handleLogout} variant="destructive" aria-label="خروج">
            <LogOut className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">خروج</span>
          </Button>
        </div>
      </header>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>فایل‌های بارگذاری شده</CardTitle>
          <CardDescription>همه عکس‌ها و ویدیوهای بارگذاری شده را مدیریت کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <LoadingSpinner size={48} />
              <p className="mt-4">در حال بارگذاری فایل‌ها...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-md p-8">
              <Inbox className="h-16 w-16 mb-4" />
              <p className="text-xl font-semibold">هنوز هیچ فایلی بارگذاری نشده است.</p>
              <p>فایل‌های بارگذاری شده در اینجا نمایش داده می‌شوند.</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-20rem)] sm:h-[calc(100vh-18rem)] rounded-md border">
              <div className="divide-y divide-border">
                {files.map((file) => (
                  <FileListItem key={file.name} file={file} onFileUpdate={fetchFiles} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

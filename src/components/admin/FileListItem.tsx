// src/components/admin/FileListItem.tsx
"use client";

import type { UploadedFile } from "@/lib/file-system";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Edit3, Trash2, MoreVertical, FileText, Film, Image as ImageIcon, Loader2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { renameUploadedFile, deleteUploadedFile } from "@/app/actions/fileActions";
import { format } from "date-fns";

interface FileListItemProps {
  file: UploadedFile;
  onFileUpdate: () => void; // To refresh list after rename/delete
}

export function FileListItem({ file, onFileUpdate }: FileListItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleRename = async () => {
    if (!newName.trim() || newName === file.name) {
      setIsRenaming(false);
      return;
    }
    setIsSubmittingRename(true);
    try {
      const result = await renameUploadedFile(file.name, newName.trim());
      if (result.success) {
        toast({ title: "Rename Successful", description: result.message });
        onFileUpdate();
      } else {
        toast({ variant: "destructive", title: "Rename Failed", description: result.message });
        setNewName(file.name); // Reset to old name on failure
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Rename Error", description: "An unexpected error occurred." });
      setNewName(file.name);
    } finally {
      setIsRenaming(false);
      setIsSubmittingRename(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteUploadedFile(file.name);
      if (result.success) {
        toast({ title: "Delete Successful", description: result.message });
        onFileUpdate(); // This will cause the item to disappear from the list
      } else {
        toast({ variant: "destructive", title: "Delete Failed", description: result.message });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Delete Error", description: "An unexpected error occurred." });
    } finally {
      setIsDeleting(false);
    }
  };

  const FileIcon = () => {
    if (file.type.startsWith("image/")) return <ImageIcon className="h-8 w-8 text-primary" data-ai-hint="photo" />;
    if (file.type.startsWith("video/")) return <Film className="h-8 w-8 text-indigo-500" data-ai-hint="movie film" />;
    return <FileText className="h-8 w-8 text-gray-500" data-ai-hint="document" />;
  };

  return (
    <div className="flex items-center justify-between p-4 border-b hover:bg-muted/50 transition-colors duration-150">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {file.type.startsWith("image/") ? (
          <Image
            src={file.url}
            alt={file.name}
            width={48}
            height={48}
            className="rounded object-cover aspect-square"
            data-ai-hint="thumbnail image"
          />
        ) : (
          <div className="w-12 h-12 flex items-center justify-center rounded bg-muted">
            <FileIcon />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-foreground" title={file.name}>{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(file.size / (1024 * 1024)).toFixed(2)} MB &bull; {format(new Date(file.lastModified), "PPp")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <Dialog open={isRenaming} onOpenChange={(open) => { setIsRenaming(open); if(!open) setNewName(file.name);}}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Rename file" className="hidden sm:inline-flex">
              <Edit3 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename File</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <label htmlFor="newName" className="text-sm font-medium">New filename (extension will be preserved if not specified):</label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new filename"
                disabled={isSubmittingRename}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isSubmittingRename}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleRename} disabled={isSubmittingRename || !newName.trim() || newName === file.name} className="bg-accent hover:bg-accent/90">
                {isSubmittingRename && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
             <Button variant="ghost" size="icon" aria-label="Delete file" className="text-destructive hover:text-destructive hidden sm:inline-flex">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the file "{file.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                 {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <Button variant="ghost" size="icon" asChild aria-label="Download file" className="hidden sm:inline-flex">
          <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4" />
          </a>
        </Button>

        {/* Dropdown for smaller screens or more actions */}
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setIsRenaming(true)}>
                    <Edit3 className="mr-2 h-4 w-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                   <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer" className="flex items-center">
                     <Download className="mr-2 h-4 w-4" /> Download
                   </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
            </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </div>
  );
}

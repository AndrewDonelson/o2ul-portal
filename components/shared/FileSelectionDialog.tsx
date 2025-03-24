// file: /components/shared/FileSelectionDialog.tsx
// feature: File selection dialog

import React, { useCallback, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import EmptyState from "./EmptyState";
import { useToast } from "@/components/ui/use-toast";
import { 
  Plus, 
  Trash2, 
  Check, 
  Upload, 
  X, 
  Image as ImageIcon, 
  Music, 
  FileQuestion,
  Loader2 
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Define content type validation
const ContentTypes = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg"]
} as const;

type ContentType = keyof typeof ContentTypes;
type AllowedMimeType = typeof ContentTypes[ContentType][number];

// Validation function with proper type checking
const isValidFileType = (file: File, contentType: ContentType): boolean => {
  const allowedTypes = ContentTypes[contentType];
  return allowedTypes.some(type => file.type === type);
};

interface FileData {
  _id: Id<"files">;
  url: string | null;
  name: string;
  storageId: Id<"_storage">;
  contentType: string;
  size: number;
  createdAt: number;
}

interface FileSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: {
    url: string;
    storageId: Id<"_storage">;
  }) => void;
  contentType: ContentType;
}

const FileSelectionDialog: React.FC<FileSelectionDialogProps> = ({
  isOpen,
  onClose,
  onFileSelect,
  contentType,
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("browse");

  const files = useQuery(api.users.index.getUserFiles, { contentType });
  const removeFile = useMutation(api.files.removeFile);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const addFile = useMutation(api.files.addFile);
  const getFileUrl = useMutation(api.files.getUrl);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Validate file type
      if (!isValidFileType(file, contentType)) {
        toast({
          title: "Invalid file type",
          description: `Please upload a ${contentType} file`,
          variant: "destructive"
        });
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      // Get upload URL
      setUploadProgress(30);
      const uploadUrl = await generateUploadUrl({});

      // Upload file
      setUploadProgress(50);
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();
      setUploadProgress(70);

      // Add file record
      const fileId = await addFile({
        name: file.name,
        contentType: file.type,
        storageId,
        size: file.size,
        md5Hash: "" // Optional
      });
      setUploadProgress(90);

      // Get the URL for the uploaded file
      const url = await getFileUrl({ storageId });
      setUploadProgress(100);

      if (url) {
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          setActiveTab("browse");
          onFileSelect({ url, storageId });
          toast({ 
            title: "File uploaded successfully",
            description: "Your file is now available in your library"
          });
        }, 500);
      }

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [contentType, generateUploadUrl, addFile, getFileUrl, onFileSelect, toast]);

  const handleFileSelect = (file: FileData) => {
    if (file.url && file.storageId) {
      onFileSelect({
        url: file.url,
        storageId: file.storageId
      });
      onClose();
    } else {
      toast({ 
        title: "Error", 
        description: "File URL is not available",
        variant: "destructive"
      });
    }
  };

  const handleFileDelete = async (fileId: Id<"files">, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeFile({ fileId });
      toast({ 
        title: "File deleted", 
        description: "The file has been removed from your library"
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({ 
        title: "Deletion failed", 
        description: "The file could not be deleted",
        variant: "destructive"
      });
    }
  };

  // Custom file preview component using Next.js Image
  const FilePreview = ({ file }: { file: FileData }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    
    if (!file.url) {
      return (
        <div className="flex items-center justify-center h-full bg-muted/50">
          <FileQuestion className="h-12 w-12 text-muted-foreground/50" />
        </div>
      );
    }

    if (file.contentType.startsWith('image/')) {
      return (
        <div className="relative w-full h-full">
          {!loaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          <div className={cn(
            "absolute inset-0 w-full h-full transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            error ? "hidden" : "block"
          )}>
            <Image
              src={file.url}
              alt={file.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 
                     (max-width: 1200px) 50vw, 
                     33vw"
              onLoadingComplete={() => setLoaded(true)}
              onError={() => setError(true)}
            />
          </div>
        </div>
      );
    } else if (file.contentType.startsWith('audio/')) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-2 bg-muted/20">
          <Music className="h-10 w-10 text-primary/80 mb-2" />
          <audio src={file.url} controls className="w-full max-w-[120px]" />
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <FileQuestion className="h-12 w-12 text-muted-foreground/50" />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-sm animate-fade-in-up">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold">
            {contentType === 'image' ? 'Select Image' : 'Select Audio'}
          </DialogTitle>
          <DialogDescription>
            Choose from your library or upload a new file
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="browse" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <span>My Library</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="browse" className="mt-2 p-1 focus-visible:outline-none focus-visible:ring-0">
            {files && files.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-5 overflow-y-auto max-h-[60vh]">
                {files.map((file: FileData) => (
                  <div 
                    key={file._id} 
                    onClick={() => handleFileSelect(file)}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-border cursor-pointer hover:border-primary transition-all duration-200 animate-fade-in"
                  >
                    <div className="absolute inset-0">
                      <FilePreview file={file} />
                    </div>
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200">
                      <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Top action - Delete */}
                        <div className="flex justify-end">
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-7 w-7 rounded-full"
                            onClick={(e) => handleFileDelete(file._id, e)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        {/* Bottom info */}
                        <div className="flex flex-col">
                          <span className="text-xs text-white font-medium truncate drop-shadow-md">
                            {file.name}
                          </span>
                          <span className="text-xs text-white/70 truncate drop-shadow-md">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Select button that appears at bottom on hover */}
                    <div className="absolute bottom-0 left-0 right-0 h-0 group-hover:h-8 bg-primary flex items-center justify-center overflow-hidden transition-all duration-200">
                      <span className="flex items-center text-xs font-medium text-primary-foreground">
                        <Check className="h-3.5 w-3.5 mr-1" /> Select
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyState
                  title={`No ${contentType} files found`}
                  description={`Upload your first ${contentType} to get started`}
                  search={false}
                  buttonLink=""
                  buttonText=""
                />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="upload" className="mt-2 p-6 focus-visible:outline-none focus-visible:ring-0 animate-fade-in">
            <div className="space-y-4">
              {isUploading ? (
                <div className="space-y-4 py-6 animate-fade-in-up">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">Uploading file...</h3>
                    <p className="text-sm text-muted-foreground">
                      Please wait while we upload your file
                    </p>
                  </div>
                  
                  <Progress value={uploadProgress} className="h-2" />
                  
                  <div className="text-center text-sm text-muted-foreground">
                    {uploadProgress}% complete
                  </div>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors duration-200 cursor-pointer group"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-200">
                      <Upload className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-200" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Upload your {contentType}</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Drag and drop your {contentType} here, or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {contentType === 'image' ? 
                          'Supports JPG, PNG, GIF, WebP up to 10MB' : 
                          'Supports MP3, WAV, OGG up to 10MB'}
                      </p>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept={ContentTypes[contentType].join(',')}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div className="text-center text-xs text-muted-foreground">
                By uploading, you confirm you have the right to use this file
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex items-center gap-1">
            <X className="h-4 w-4" />
            <span>Cancel</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileSelectionDialog;
import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon, Video, Loader2 } from 'lucide-react';

interface CloudinaryUploadProps {
  type: 'image' | 'video';
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string;
}

export const CloudinaryUpload = ({
  type,
  value,
  onChange,
  label,
  accept,
}: CloudinaryUploadProps) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);

  // Get Cloudinary config from environment
  // Note: For production, set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const handleUpload = useCallback(async (file: File) => {
    if (!cloudName || !uploadPreset) {
      toast({
        title: 'Cloudinary Not Configured',
        description: 'Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file. These are public keys and safe to include in frontend code.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    if (type === 'image' && !file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
      toast({ title: 'Invalid file type', description: 'Please upload a video file', variant: 'destructive' });
      return;
    }

    // File size limits (10MB for images, 100MB for videos)
    const maxSize = type === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: `Maximum file size is ${type === 'image' ? '10MB' : '100MB'}`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('resource_type', type === 'video' ? 'video' : 'image');

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setProgress(percentComplete);
        }
      });

      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve(response.secure_url);
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
      });

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/${type === 'video' ? 'video' : 'image'}/upload`);
      xhr.send(formData);

      const url = await uploadPromise;
      setPreviewUrl(url);
      onChange(url);
      toast({ title: 'Upload successful!' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: 'Please try again', variant: 'destructive' });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [cloudName, uploadPreset, type, onChange, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const defaultAccept = type === 'image' ? 'image/*' : 'video/*';

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      
      <Input
        ref={inputRef}
        type="file"
        accept={accept || defaultAccept}
        onChange={handleFileChange}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative group">
          {type === 'image' ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-xs rounded-lg border"
            />
          ) : (
            <video
              src={previewUrl}
              className="max-w-xs rounded-lg border"
              controls
            />
          )}
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <div className="space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <Progress value={progress} className="max-w-xs mx-auto" />
              <p className="text-sm text-muted-foreground">Uploading... {progress}%</p>
            </div>
          ) : (
            <>
              {type === 'image' ? (
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              ) : (
                <Video className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              )}
              <p className="text-sm text-muted-foreground mb-1">
                Drag & drop or click to upload
              </p>
              <p className="text-xs text-muted-foreground">
                {type === 'image' ? 'PNG, JPG, GIF up to 10MB' : 'MP4, MOV, AVI up to 100MB'}
              </p>
            </>
          )}
        </div>
      )}

      {uploading && (
        <Progress value={progress} className="h-2" />
      )}
    </div>
  );
};
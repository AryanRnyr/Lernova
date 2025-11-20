import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CloudinaryUpload } from '@/components/ui/cloudinary-upload';
import { Loader2 } from 'lucide-react';

interface LectureData {
  title: string;
  video_url: string;
  duration: number;
  is_preview: boolean;
}

interface LectureUploadFormProps {
  initialData?: LectureData;
  onSubmit: (data: LectureData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const LectureUploadForm = ({
  initialData,
  onSubmit,
  onCancel,
  loading,
}: LectureUploadFormProps) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [videoUrl, setVideoUrl] = useState(initialData?.video_url || '');
  const [duration, setDuration] = useState(initialData?.duration?.toString() || '0');
  const [isPreview, setIsPreview] = useState(initialData?.is_preview || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title,
      video_url: videoUrl,
      duration: parseInt(duration) || 0,
      is_preview: isPreview,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="lecture-title">Lecture Title *</Label>
        <Input
          id="lecture-title"
          placeholder="e.g., Introduction to React Hooks"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <CloudinaryUpload
        type="video"
        value={videoUrl}
        onChange={setVideoUrl}
        label="Lecture Video"
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (seconds)</Label>
          <Input
            id="duration"
            type="number"
            min="0"
            placeholder="300"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2 pt-8">
          <Switch
            id="is-preview"
            checked={isPreview}
            onCheckedChange={setIsPreview}
          />
          <Label htmlFor="is-preview">Free Preview</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !title}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Update Lecture' : 'Add Lecture'}
        </Button>
      </div>
    </form>
  );
};
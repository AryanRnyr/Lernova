import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, ChevronDown, ChevronRight, GripVertical, Trash2, Edit, Video, FileText } from 'lucide-react';

interface Subsection {
  id: string;
  title: string;
  video_url: string | null;
  duration: number | null;
  position: number;
  is_preview: boolean;
}

interface Section {
  id: string;
  title: string;
  position: number;
  subsections: Subsection[];
}

interface CurriculumEditorProps {
  courseId: string;
}

export const CurriculumEditor = ({ courseId }: CurriculumEditorProps) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Section dialog state
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionTitle, setSectionTitle] = useState('');

  // Lecture dialog state
  const [lectureDialogOpen, setLectureDialogOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Subsection | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureVideoUrl, setLectureVideoUrl] = useState('');
  const [lectureDuration, setLectureDuration] = useState('');
  const [lectureIsPreview, setLectureIsPreview] = useState(false);

  useEffect(() => {
    fetchCurriculum();
  }, [courseId]);

  const fetchCurriculum = async () => {
    const { data: sectionsData, error } = await supabase
      .from('sections')
      .select(`
        id,
        title,
        position,
        subsections (
          id,
          title,
          video_url,
          duration,
          position,
          is_preview
        )
      `)
      .eq('course_id', courseId)
      .order('position');

    if (error) {
      console.error('Error fetching curriculum:', error);
    } else {
      const formattedSections = sectionsData.map((s: any) => ({
        ...s,
        subsections: s.subsections.sort((a: Subsection, b: Subsection) => a.position - b.position),
      }));
      setSections(formattedSections);
      // Open all sections by default
      setOpenSections(new Set(formattedSections.map((s: Section) => s.id)));
    }
    setLoading(false);
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Section CRUD
  const openSectionDialog = (section?: Section) => {
    if (section) {
      setEditingSection(section);
      setSectionTitle(section.title);
    } else {
      setEditingSection(null);
      setSectionTitle('');
    }
    setSectionDialogOpen(true);
  };

  const handleSaveSection = async () => {
    if (!sectionTitle.trim()) return;

    if (editingSection) {
      const { error } = await supabase
        .from('sections')
        .update({ title: sectionTitle })
        .eq('id', editingSection.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        await fetchCurriculum();
        toast({ title: 'Section updated' });
      }
    } else {
      const { error } = await supabase
        .from('sections')
        .insert({
          course_id: courseId,
          title: sectionTitle,
          position: sections.length,
        });

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        await fetchCurriculum();
        toast({ title: 'Section added' });
      }
    }

    setSectionDialogOpen(false);
  };

  const handleDeleteSection = async (sectionId: string) => {
    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', sectionId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      await fetchCurriculum();
      toast({ title: 'Section deleted' });
    }
  };

  // Lecture CRUD
  const openLectureDialog = (sectionId: string, lecture?: Subsection) => {
    setCurrentSectionId(sectionId);
    if (lecture) {
      setEditingLecture(lecture);
      setLectureTitle(lecture.title);
      setLectureVideoUrl(lecture.video_url || '');
      setLectureDuration(lecture.duration?.toString() || '');
      setLectureIsPreview(lecture.is_preview);
    } else {
      setEditingLecture(null);
      setLectureTitle('');
      setLectureVideoUrl('');
      setLectureDuration('');
      setLectureIsPreview(false);
    }
    setLectureDialogOpen(true);
  };

  const handleSaveLecture = async () => {
    if (!lectureTitle.trim() || !currentSectionId) return;

    const section = sections.find((s) => s.id === currentSectionId);
    const lectureData = {
      title: lectureTitle,
      video_url: lectureVideoUrl || null,
      duration: lectureDuration ? parseInt(lectureDuration) : null,
      is_preview: lectureIsPreview,
    };

    if (editingLecture) {
      const { error } = await supabase
        .from('subsections')
        .update(lectureData)
        .eq('id', editingLecture.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        await fetchCurriculum();
        toast({ title: 'Lecture updated' });
      }
    } else {
      const { error } = await supabase
        .from('subsections')
        .insert({
          ...lectureData,
          section_id: currentSectionId,
          position: section?.subsections.length || 0,
        });

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        await fetchCurriculum();
        toast({ title: 'Lecture added' });
      }
    }

    setLectureDialogOpen(false);
  };

  const handleDeleteLecture = async (lectureId: string) => {
    const { error } = await supabase
      .from('subsections')
      .delete()
      .eq('id', lectureId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      await fetchCurriculum();
      toast({ title: 'Lecture deleted' });
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading curriculum...</div>;
  }

  return (
    <div className="space-y-4">
      {sections.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No sections yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by adding your first section
          </p>
        </div>
      ) : (
        sections.map((section, sectionIndex) => (
          <Collapsible
            key={section.id}
            open={openSections.has(section.id)}
            onOpenChange={() => toggleSection(section.id)}
          >
            <div className="border rounded-lg">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    {openSections.has(section.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      Section {sectionIndex + 1}: {section.title}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({section.subsections.length} lectures)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSectionDialog(section);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSection(section.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t px-4 py-2 space-y-2">
                  {section.subsections.map((lecture, lectureIndex) => (
                    <div
                      key={lecture.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {sectionIndex + 1}.{lectureIndex + 1} {lecture.title}
                        </span>
                        {lecture.is_preview && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Preview
                          </span>
                        )}
                        {lecture.duration && (
                          <span className="text-xs text-muted-foreground">
                            {Math.floor(lecture.duration / 60)}:{(lecture.duration % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openLectureDialog(section.id, lecture)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLecture(lecture.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => openLectureDialog(section.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Lecture
                  </Button>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))
      )}

      <Button variant="outline" className="w-full" onClick={() => openSectionDialog()}>
        <Plus className="h-4 w-4 mr-2" />
        Add Section
      </Button>

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? 'Edit Section' : 'Add Section'}</DialogTitle>
            <DialogDescription>
              {editingSection ? 'Update the section title' : 'Enter a title for the new section'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="section-title">Section Title</Label>
              <Input
                id="section-title"
                placeholder="e.g., Introduction to the Course"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSection}>{editingSection ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lecture Dialog */}
      <Dialog open={lectureDialogOpen} onOpenChange={setLectureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLecture ? 'Edit Lecture' : 'Add Lecture'}</DialogTitle>
            <DialogDescription>
              {editingLecture ? 'Update the lecture details' : 'Enter details for the new lecture'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lecture-title">Lecture Title *</Label>
              <Input
                id="lecture-title"
                placeholder="e.g., Welcome to the Course"
                value={lectureTitle}
                onChange={(e) => setLectureTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lecture-video">Video URL (Cloudinary)</Label>
              <Input
                id="lecture-video"
                type="url"
                placeholder="https://res.cloudinary.com/..."
                value={lectureVideoUrl}
                onChange={(e) => setLectureVideoUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lecture-duration">Duration (seconds)</Label>
              <Input
                id="lecture-duration"
                type="number"
                min="0"
                placeholder="300"
                value={lectureDuration}
                onChange={(e) => setLectureDuration(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="lecture-preview">Free Preview</Label>
                <p className="text-sm text-muted-foreground">
                  Allow non-enrolled users to preview
                </p>
              </div>
              <Switch
                id="lecture-preview"
                checked={lectureIsPreview}
                onCheckedChange={setLectureIsPreview}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLectureDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLecture}>{editingLecture ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

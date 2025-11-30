import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Circle, PlayCircle, ChevronLeft, Clock, FileText, Loader2 } from 'lucide-react';

// Lazy load ReactPlayer for better performance
const ReactPlayer = lazy(() => import('react-player'));

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

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  instructor_id: string;
}

interface ProgressData {
  subsection_id: string;
  completed: boolean;
  video_progress: number | null;
}

export default function CourseLearning() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [videoProgress, setVideoProgress] = useState<Map<string, number>>(new Map());
  const [currentLesson, setCurrentLesson] = useState<Subsection | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [instructorName, setInstructorName] = useState<string>('Instructor');
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const progressSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user && slug) {
      fetchCourseData();
    }
  }, [user, slug, authLoading]);

  const fetchCourseData = async () => {
    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .single();

      if (courseError || !courseData) {
        toast({ title: 'Course not found', variant: 'destructive' });
        navigate('/catalog');
        return;
      }

      setCourse(courseData);

      // Fetch instructor name
      const { data: instructorData } = await supabase.rpc('get_instructor_profile', {
        instructor_user_id: courseData.instructor_id,
      });
      if (instructorData && instructorData.length > 0) {
        setInstructorName(instructorData[0].full_name || 'Instructor');
      }

      // Check enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseData.id)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!enrollment) {
        toast({ title: 'You are not enrolled in this course', variant: 'destructive' });
        navigate(`/course/${slug}`);
        return;
      }

      setIsEnrolled(true);

      // Fetch sections with subsections
      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, title, position')
        .eq('course_id', courseData.id)
        .order('position');

      let sectionsWithSubs: Section[] = [];
      
      if (sectionsData) {
        sectionsWithSubs = await Promise.all(
          sectionsData.map(async (section) => {
            const { data: subs } = await supabase
              .from('subsections')
              .select('*')
              .eq('section_id', section.id)
              .order('position');

            return { ...section, subsections: subs || [] };
          })
        );
        setSections(sectionsWithSubs);
      }

      // Get all subsection IDs for this course
      const { data: allSubs } = await supabase
        .from('subsections')
        .select('id, section_id')
        .in('section_id', sectionsData?.map(s => s.id) || []);

      if (allSubs && allSubs.length > 0) {
        const { data: progress } = await supabase
          .from('course_progress')
          .select('subsection_id, completed, video_progress')
          .eq('user_id', user!.id)
          .in('subsection_id', allSubs.map(s => s.id));

        if (progress) {
          const completed = new Set<string>();
          const videoProgressMap = new Map<string, number>();
          
          progress.forEach((p: ProgressData) => {
            if (p.completed) {
              completed.add(p.subsection_id);
            }
            if (p.video_progress) {
              videoProgressMap.set(p.subsection_id, p.video_progress);
            }
          });
          
          setCompletedLessons(completed);
          setVideoProgress(videoProgressMap);
          
          // Find the last watched lesson or first incomplete lesson
          if (sectionsWithSubs.length > 0) {
            let resumeLesson: Subsection | null = null;
            
            // First, try to find a lesson with saved progress
            for (const section of sectionsWithSubs) {
              for (const sub of section.subsections) {
                if (videoProgressMap.has(sub.id) && !completed.has(sub.id)) {
                  resumeLesson = sub;
                  break;
                }
              }
              if (resumeLesson) break;
            }
            
            // If no lesson with progress, find first incomplete
            if (!resumeLesson) {
              for (const section of sectionsWithSubs) {
                for (const sub of section.subsections) {
                  if (!completed.has(sub.id)) {
                    resumeLesson = sub;
                    break;
                  }
                }
                if (resumeLesson) break;
              }
            }
            
            if (resumeLesson) {
              setCurrentLesson(resumeLesson);
            } else if (sectionsWithSubs[0]?.subsections[0]) {
              // If all completed, start from beginning
              setCurrentLesson(sectionsWithSubs[0].subsections[0]);
            }
          }
        }
      } else if (sectionsWithSubs.length > 0 && sectionsWithSubs[0].subsections.length > 0) {
        // No progress data, start from beginning
        setCurrentLesson(sectionsWithSubs[0].subsections[0]);
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
      toast({ title: 'Error loading course', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Save video progress to database (debounced)
  const saveVideoProgress = useCallback(async (subsectionId: string, currentTime: number) => {
    if (!user) return;
    
    try {
      await supabase.from('course_progress').upsert({
        user_id: user.id,
        subsection_id: subsectionId,
        video_progress: Math.floor(currentTime),
        last_watched_at: new Date().toISOString(),
        completed: completedLessons.has(subsectionId),
      }, {
        onConflict: 'user_id,subsection_id',
      });
    } catch (error) {
      console.error('Error saving video progress:', error);
    }
  }, [user, completedLessons]);

  // Handle video progress update (debounced save every 5 seconds)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleProgress = useCallback((state: any) => {
    if (!currentLesson) return;

    const currentTime = state.playedSeconds;
    setPlayed(currentTime);

    // Update local state
    setVideoProgress(prev => new Map(prev).set(currentLesson.id, currentTime));

    // Debounce save to database
    if (progressSaveTimeout.current) {
      clearTimeout(progressSaveTimeout.current);
    }
    
    progressSaveTimeout.current = setTimeout(() => {
      saveVideoProgress(currentLesson.id, currentTime);
    }, 5000); // Save every 5 seconds
  }, [currentLesson, saveVideoProgress]);

  // Handle video ended
  const handleVideoEnded = useCallback(() => {
    if (currentLesson && !completedLessons.has(currentLesson.id)) {
      markLessonComplete();
    }
  }, [currentLesson, completedLessons]);

  // Get saved progress for seeking
  const getInitialSeekTime = useCallback(() => {
    if (currentLesson) {
      const savedProgress = videoProgress.get(currentLesson.id);
      if (savedProgress && savedProgress > 0) {
        return savedProgress;
      }
    }
    return 0;
  }, [currentLesson, videoProgress]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (progressSaveTimeout.current) {
        clearTimeout(progressSaveTimeout.current);
      }
    };
  }, []);

  const handleLessonClick = (subsection: Subsection) => {
    // Save current progress before switching
    if (currentLesson && playerRef.current) {
      saveVideoProgress(currentLesson.id, playerRef.current.currentTime || 0);
    }
    setCurrentLesson(subsection);
    setPlaying(false);
    setPlayed(0);
  };

  const markLessonComplete = async () => {
    if (!currentLesson || !user) return;

    setMarkingComplete(true);
    try {
      const isCompleted = completedLessons.has(currentLesson.id);

      if (isCompleted) {
        // Remove completion
        await supabase
          .from('course_progress')
          .delete()
          .eq('user_id', user.id)
          .eq('subsection_id', currentLesson.id);

        setCompletedLessons((prev) => {
          const newSet = new Set(prev);
          newSet.delete(currentLesson.id);
          return newSet;
        });
        toast({ title: 'Lesson marked as incomplete' });
      } else {
        // Mark as complete
        await supabase.from('course_progress').upsert({
          user_id: user.id,
          subsection_id: currentLesson.id,
          completed: true,
          completed_at: new Date().toISOString(),
        });

        setCompletedLessons((prev) => new Set(prev).add(currentLesson.id));
        toast({ title: 'Lesson marked as complete!' });

        // Move to next lesson
        moveToNextLesson();
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({ title: 'Error updating progress', variant: 'destructive' });
    } finally {
      setMarkingComplete(false);
    }
  };

  const moveToNextLesson = () => {
    if (!currentLesson) return;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      for (let j = 0; j < section.subsections.length; j++) {
        if (section.subsections[j].id === currentLesson.id) {
          // Check if there's a next lesson in this section
          if (j < section.subsections.length - 1) {
            setCurrentLesson(section.subsections[j + 1]);
            return;
          }
          // Check if there's a next section
          if (i < sections.length - 1 && sections[i + 1].subsections.length > 0) {
            setCurrentLesson(sections[i + 1].subsections[0]);
            return;
          }
        }
      }
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalLessons = () => {
    return sections.reduce((acc, section) => acc + section.subsections.length, 0);
  };

  const getProgressPercentage = () => {
    const total = getTotalLessons();
    if (total === 0) return 0;
    return Math.round((completedLessons.size / total) * 100);
  };

  if (loading || authLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-video w-full" />
            </div>
            <div>
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!course || !isEnrolled) {
    return null;
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-muted/30">
        {/* Header */}
        <div className="bg-background border-b">
          <div className="container py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-lg font-semibold truncate">{course.title}</h1>
                <p className="text-sm text-muted-foreground">by {instructorName}</p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {completedLessons.size} / {getTotalLessons()} lessons
                </span>
                <Progress value={getProgressPercentage()} className="w-32 h-2" />
                <span className="text-sm font-medium">{getProgressPercentage()}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-background rounded-lg border overflow-hidden">
                {currentLesson?.video_url ? (
                  <div className="aspect-video bg-black relative">
                    <Suspense fallback={
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    }>
                      <ReactPlayer
                        ref={playerRef}
                        src={currentLesson.video_url}
                        width="100%"
                        height="100%"
                        playing={playing}
                        controls
                        onPlay={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        onTimeUpdate={(e: React.SyntheticEvent<HTMLVideoElement>) => {
                          const video = e.currentTarget;
                          handleProgress({ playedSeconds: video.currentTime });
                        }}
                        onDurationChange={(e: React.SyntheticEvent<HTMLVideoElement>) => {
                          setDuration(e.currentTarget.duration);
                        }}
                        onEnded={handleVideoEnded}
                        onReady={() => {
                          // Seek to saved position
                          const seekTime = getInitialSeekTime();
                          if (seekTime > 0 && playerRef.current) {
                            playerRef.current.currentTime = seekTime;
                          }
                        }}
                      />
                    </Suspense>
                    {/* Resume timestamp indicator */}
                    {videoProgress.get(currentLesson.id) && videoProgress.get(currentLesson.id)! > 0 && played === 0 && (
                      <div className="absolute bottom-16 left-4 bg-background/90 text-foreground px-3 py-1 rounded-md text-sm font-medium">
                        Resume from {formatTimestamp(videoProgress.get(currentLesson.id)!)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2" />
                      <p>No video for this lesson</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Lesson Info */}
              <div className="bg-background rounded-lg border p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{currentLesson?.title || 'Select a lesson'}</h2>
                    {currentLesson?.duration && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(currentLesson.duration)}
                      </p>
                    )}
                  </div>
                  {currentLesson && (
                    <Button
                      onClick={markLessonComplete}
                      disabled={markingComplete}
                      variant={completedLessons.has(currentLesson.id) ? 'outline' : 'default'}
                    >
                      {completedLessons.has(currentLesson.id) ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Completed
                        </>
                      ) : (
                        'Mark as Complete'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Course Curriculum Sidebar */}
            <div className="bg-background rounded-lg border overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Course Content</h3>
                <p className="text-sm text-muted-foreground">
                  {sections.length} sections • {getTotalLessons()} lessons
                </p>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                <Accordion type="multiple" defaultValue={sections.map((s) => s.id)} className="w-full">
                  {sections.map((section) => (
                    <AccordionItem key={section.id} value={section.id}>
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2 text-left">
                          <span className="font-medium">{section.title}</span>
                          <span className="text-xs text-muted-foreground">
                            ({section.subsections.filter((s) => completedLessons.has(s.id)).length}/
                            {section.subsections.length})
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="space-y-1 pb-2">
                          {section.subsections.map((subsection) => {
                            const isActive = currentLesson?.id === subsection.id;
                            const isCompleted = completedLessons.has(subsection.id);

                            return (
                              <button
                                key={subsection.id}
                                onClick={() => handleLessonClick(subsection)}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                                  isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'hover:bg-muted'
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                                ) : isActive ? (
                                  <PlayCircle className="h-4 w-4 shrink-0" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                                <span className="flex-1 truncate">{subsection.title}</span>
                                {subsection.duration && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatDuration(subsection.duration)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

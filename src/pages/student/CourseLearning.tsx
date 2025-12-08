import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Circle, PlayCircle, ChevronLeft, Clock, FileText, Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

// Custom Video Player Component
interface VideoPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onDurationChange?: (duration: number) => void;
  initialTime?: number;
}

const VideoPlayer = ({ src, onTimeUpdate, onEnded, onDurationChange, initialTime = 0 }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      onTimeUpdate?.(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      onDurationChange?.(videoRef.current.duration);
      if (initialTime > 0) {
        videoRef.current.currentTime = initialTime;
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.volume = value[0];
      setVolume(value[0]);
      setIsMuted(value[0] === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = newRate;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full aspect-video"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
      />
      
      {/* Play button overlay */}
      {!isPlaying && (
        <button 
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
        >
          <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center">
            <Play className="w-10 h-10 text-primary-foreground ml-1" />
          </div>
        </button>
      )}

      {/* Controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Progress bar */}
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="mb-3 cursor-pointer"
        />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>
            
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={cyclePlaybackRate} 
              className="text-white hover:text-primary transition-colors text-sm font-medium px-2 py-1 rounded bg-white/20"
            >
              {playbackRate}x
            </button>
            <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (progressSaveTimeout.current) {
        clearTimeout(progressSaveTimeout.current);
      }
    };
  }, []);

  const handleLessonClick = (subsection: Subsection) => {
    setCurrentLesson(subsection);
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
                  <VideoPlayer
                    key={currentLesson.id}
                    src={currentLesson.video_url}
                    initialTime={videoProgress.get(currentLesson.id) || 0}
                    onTimeUpdate={(time) => handleProgress({ playedSeconds: time })}
                    onEnded={handleVideoEnded}
                    onDurationChange={(d) => setDuration(d)}
                  />
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

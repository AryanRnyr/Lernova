import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CourseReviewFormProps {
  courseId: string;
  userId: string;
  existingReview?: {
    id: string;
    rating: number;
    comment: string | null;
  } | null;
  onReviewSubmitted: () => void;
}

export function CourseReviewForm({
  courseId,
  userId,
  existingReview,
  onReviewSubmitted,
}: CourseReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast({
        variant: 'destructive',
        title: 'Rating Required',
        description: 'Please select a rating before submitting.',
      });
      return;
    }

    setSubmitting(true);

    try {
      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update({
            rating,
            comment: comment.trim() || null,
          })
          .eq('id', existingReview.id);

        if (error) throw error;

        toast({
          title: 'Review Updated',
          description: 'Your review has been updated successfully.',
        });
      } else {
        // Create new review
        const { error } = await supabase.from('reviews').insert({
          course_id: courseId,
          user_id: userId,
          rating,
          comment: comment.trim() || null,
        });

        if (error) throw error;

        toast({
          title: 'Review Submitted',
          description: 'Thank you for your feedback!',
        });
      }

      onReviewSubmitted();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to submit review.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {existingReview ? 'Update Your Review' : 'Write a Review'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating */}
          <div>
            <label className="text-sm font-medium mb-2 block">Your Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Your Review (Optional)
            </label>
            <Textarea
              placeholder="Share your experience with this course..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>

          <Button type="submit" disabled={submitting || rating === 0}>
            {submitting
              ? 'Submitting...'
              : existingReview
              ? 'Update Review'
              : 'Submit Review'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

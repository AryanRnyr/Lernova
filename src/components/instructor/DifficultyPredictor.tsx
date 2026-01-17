import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DifficultyPredictorProps {
  title: string;
  description: string;
  currentDifficulty: string;
  onDifficultyChange: (difficulty: string) => void;
}

export const DifficultyPredictor = ({ 
  title, 
  description, 
  currentDifficulty,
  onDifficultyChange 
}: DifficultyPredictorProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<{ difficulty: string; confidence: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const predictDifficulty = async () => {
    if (!title.trim()) {
      setError('Please enter a course title first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('predict-difficulty', {
        body: { title, description }
      });

      if (fnError) throw fnError;

      setPrediction({
        difficulty: data.difficulty,
        confidence: data.confidence || 0
      });
    } catch (err) {
      console.error('Prediction error:', err);
      setError('Failed to predict difficulty. Using default.');
      setPrediction({ difficulty: 'Medium', confidence: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const applyPrediction = () => {
    if (prediction) {
      const difficultyMap: Record<string, string> = {
        'Easy': 'beginner',
        'Medium': 'intermediate',
        'Hard': 'advanced'
      };
      onDifficultyChange(difficultyMap[prediction.difficulty] || 'intermediate');
      setPrediction(null);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'Easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={predictDifficulty}
          disabled={isLoading || !title.trim()}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Predict Difficulty with AI
        </Button>
        
        {currentDifficulty && (
          <Badge variant="outline" className="capitalize">
            Current: {currentDifficulty}
          </Badge>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {prediction && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">AI Prediction:</span>
              <Badge className={cn("font-semibold", getDifficultyColor(prediction.difficulty))}>
                {prediction.difficulty}
              </Badge>
              {prediction.confidence > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({prediction.confidence}% confidence)
                </span>
              )}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={applyPrediction}
            className="gap-1"
          >
            <Check className="h-4 w-4" />
            Apply
          </Button>
        </div>
      )}
    </div>
  );
};
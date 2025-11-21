import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Lightbulb, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PricingSuggestionProps {
  courseId: string;
  currentPrice: number;
  onApplyPrice: (price: number) => void;
}

export function PricingSuggestion({
  courseId,
  currentPrice,
  onApplyPrice,
}: PricingSuggestionProps) {
  const [recommendedPrice, setRecommendedPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<{
    duration: string;
    rating: string;
    demand: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        const { data, error } = await supabase.rpc('calculate_recommended_price', {
          course_uuid: courseId,
        });

        if (error) throw error;

        setRecommendedPrice(data);

        // Fetch course data for factor analysis
        const { data: courseData } = await supabase
          .from('courses')
          .select('total_duration, average_rating')
          .eq('id', courseId)
          .single();

        const { count: enrollmentCount } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', courseId);

        if (courseData) {
          const duration = courseData.total_duration || 0;
          const rating = courseData.average_rating || 0;
          const enrollments = enrollmentCount || 0;

          setFactors({
            duration:
              duration > 300
                ? 'Long course duration (+10%)'
                : duration > 120
                ? 'Medium duration'
                : 'Short course (-5%)',
            rating:
              rating >= 4
                ? 'High ratings (+10%)'
                : rating >= 3
                ? 'Good ratings'
                : 'Building reputation',
            demand:
              enrollments > 50
                ? 'High demand (+15%)'
                : enrollments > 10
                ? 'Growing interest'
                : 'Building audience',
          });
        }
      } catch (error) {
        console.error('Error fetching price recommendation:', error);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchRecommendation();
    }
  }, [courseId]);

  const handleApply = () => {
    if (recommendedPrice) {
      onApplyPrice(recommendedPrice);
      toast({
        title: 'Price Updated',
        description: `Course price set to NPR ${recommendedPrice.toLocaleString()}`,
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ne-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!recommendedPrice) {
    return null;
  }

  const priceDifference = recommendedPrice - currentPrice;
  const percentageDiff = currentPrice > 0 
    ? ((priceDifference / currentPrice) * 100).toFixed(0) 
    : '0';

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Dynamic Pricing Suggestion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Recommended Price</p>
            <p className="text-2xl font-bold text-primary">
              {formatPrice(recommendedPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="text-lg">{formatPrice(currentPrice)}</p>
            {priceDifference !== 0 && (
              <Badge
                variant={priceDifference > 0 ? 'default' : 'secondary'}
                className="mt-1"
              >
                {priceDifference > 0 ? '+' : ''}
                {percentageDiff}%
              </Badge>
            )}
          </div>
        </div>

        {factors && (
          <div className="space-y-2 text-sm">
            <p className="font-medium">Price Factors:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                {factors.duration}
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                {factors.rating}
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                {factors.demand}
              </li>
            </ul>
          </div>
        )}

        <Button onClick={handleApply} className="w-full" variant="outline">
          <DollarSign className="mr-2 h-4 w-4" />
          Apply Suggested Price
        </Button>
      </CardContent>
    </Card>
  );
}

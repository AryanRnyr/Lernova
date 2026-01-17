import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CloudinaryUpload } from '@/components/ui/cloudinary-upload';
import { Loader2 } from 'lucide-react';
import { DifficultyPredictor } from './DifficultyPredictor';
import { DynamicPricingForm } from './DynamicPricingForm';

interface Category {
  id: string;
  name: string;
}

interface CourseFormProps {
  initialData?: {
    title: string;
    description: string;
    category_id: string | null;
    price: number;
    is_free: boolean;
    thumbnail_url: string;
    difficulty_level?: string;
    base_price?: number;
    min_price?: number;
    max_price?: number;
    enrollment_target?: number;
    dynamic_pricing_enabled?: boolean;
  };
  onSubmit: (data: {
    title: string;
    description: string;
    category_id: string | null;
    price: number;
    is_free: boolean;
    thumbnail_url: string;
    difficulty_level: string;
    base_price: number;
    min_price: number;
    max_price: number;
    enrollment_target: number;
    dynamic_pricing_enabled: boolean;
    current_price: number;
  }) => Promise<void>;
  loading: boolean;
  currentEnrollments?: number;
}

export const CourseForm = ({ initialData, onSubmit, loading, currentEnrollments = 0 }: CourseFormProps) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [categoryId, setCategoryId] = useState<string | null>(initialData?.category_id || null);
  const [price, setPrice] = useState(initialData?.price?.toString() || '0');
  const [isFree, setIsFree] = useState(initialData?.is_free ?? true);
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnail_url || '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [difficultyLevel, setDifficultyLevel] = useState(initialData?.difficulty_level || 'beginner');
  
  // Dynamic pricing state
  const [basePrice, setBasePrice] = useState(initialData?.base_price || initialData?.price || 0);
  const [minPrice, setMinPrice] = useState(initialData?.min_price || (initialData?.price ? initialData.price * 0.5 : 0));
  const [maxPrice, setMaxPrice] = useState(initialData?.max_price || (initialData?.price ? initialData.price * 1.5 : 0));
  const [enrollmentTarget, setEnrollmentTarget] = useState(initialData?.enrollment_target || 100);
  const [dynamicPricingEnabled, setDynamicPricingEnabled] = useState(initialData?.dynamic_pricing_enabled ?? true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      
      if (data) {
        setCategories(data);
      }
    };

    fetchCategories();
  }, []);

  // Update price ranges when base price changes (for new courses)
  useEffect(() => {
    if (!initialData && !isFree) {
      const parsedPrice = parseFloat(price) || 0;
      if (parsedPrice > 0) {
        setBasePrice(parsedPrice);
        setMinPrice(Math.round(parsedPrice * 0.5));
        setMaxPrice(Math.round(parsedPrice * 1.5));
      }
    }
  }, [price, isFree, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const priceValue = isFree ? 0 : parseFloat(price) || 0;
    const finalBasePrice = isFree ? 0 : basePrice;
    const finalMinPrice = isFree ? 0 : minPrice;
    const finalMaxPrice = isFree ? 0 : maxPrice;
    
    // Calculate current price based on formula
    let currentPrice = priceValue;
    if (dynamicPricingEnabled && !isFree && enrollmentTarget > 0) {
      const ratio = Math.min(1, currentEnrollments / enrollmentTarget);
      currentPrice = finalMinPrice + (ratio * (finalMaxPrice - finalMinPrice));
      currentPrice = Math.round(currentPrice / 50) * 50;
    }
    
    await onSubmit({
      title,
      description,
      category_id: categoryId,
      price: priceValue,
      is_free: isFree,
      thumbnail_url: thumbnailUrl,
      difficulty_level: difficultyLevel,
      base_price: finalBasePrice,
      min_price: finalMinPrice,
      max_price: finalMaxPrice,
      enrollment_target: enrollmentTarget,
      dynamic_pricing_enabled: isFree ? false : dynamicPricingEnabled,
      current_price: currentPrice,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Course Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Complete Web Development Bootcamp"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what students will learn..."
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={categoryId || ''}
              onValueChange={(value) => setCategoryId(value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty Level</Label>
            <Select
              value={difficultyLevel}
              onValueChange={setDifficultyLevel}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            
            <DifficultyPredictor
              title={title}
              description={description}
              currentDifficulty={difficultyLevel}
              onDifficultyChange={setDifficultyLevel}
            />
          </div>

          <CloudinaryUpload
            type="image"
            value={thumbnailUrl}
            onChange={setThumbnailUrl}
            label="Course Thumbnail"
          />

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="is-free">Free Course</Label>
              <p className="text-sm text-muted-foreground">
                Toggle off to set a price
              </p>
            </div>
            <Switch
              id="is-free"
              checked={isFree}
              onCheckedChange={setIsFree}
            />
          </div>

          {!isFree && (
            <div className="space-y-2">
              <Label htmlFor="price">Base Price (NPR) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="1"
                placeholder="1000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required={!isFree}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {!isFree && (
        <DynamicPricingForm
          basePrice={basePrice}
          minPrice={minPrice}
          maxPrice={maxPrice}
          enrollmentTarget={enrollmentTarget}
          dynamicPricingEnabled={dynamicPricingEnabled}
          currentEnrollments={currentEnrollments}
          onBasePriceChange={setBasePrice}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onEnrollmentTargetChange={setEnrollmentTarget}
          onDynamicPricingChange={setDynamicPricingEnabled}
        />
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? 'Update Course' : 'Create Course'}
      </Button>
    </form>
  );
};

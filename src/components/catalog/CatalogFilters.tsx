import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Search, X, Filter } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CatalogFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  priceType: 'all' | 'free' | 'paid';
  onPriceTypeChange: (type: 'all' | 'free' | 'paid') => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  maxPrice: number;
  minRating: number;
  onMinRatingChange: (rating: number) => void;
  difficulty: string | null;
  onDifficultyChange: (difficulty: string | null) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function CatalogFilters({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  priceType,
  onPriceTypeChange,
  priceRange,
  onPriceRangeChange,
  maxPrice,
  minRating,
  onMinRatingChange,
  difficulty,
  onDifficultyChange,
  onClearFilters,
  hasActiveFilters,
}: CatalogFiltersProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ne-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {selectedCategory && (
            <Badge variant="secondary" className="gap-1">
              {categories.find((c) => c.id === selectedCategory)?.name}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onCategoryChange(null)}
              />
            </Badge>
          )}
          {priceType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {priceType === 'free' ? 'Free' : 'Paid'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onPriceTypeChange('all')}
              />
            </Badge>
          )}
          {minRating > 0 && (
            <Badge variant="secondary" className="gap-1">
              {minRating}+ stars
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onMinRatingChange(0)}
              />
            </Badge>
          )}
          {difficulty && (
            <Badge variant="secondary" className="gap-1">
              {difficulty}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onDifficultyChange(null)}
              />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange(null)}
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category.id)}
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* Advanced Filters */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="filters">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
              {/* Price Type */}
              <div className="space-y-2">
                <Label>Price</Label>
                <Select
                  value={priceType}
                  onValueChange={(value) =>
                    onPriceTypeChange(value as 'all' | 'free' | 'paid')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="free">Free Only</SelectItem>
                    <SelectItem value="paid">Paid Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range (only for paid) */}
              {priceType === 'paid' && (
                <div className="space-y-2">
                  <Label>
                    Price Range: {formatPrice(priceRange[0])} -{' '}
                    {formatPrice(priceRange[1])}
                  </Label>
                  <Slider
                    value={priceRange}
                    onValueChange={(value) =>
                      onPriceRangeChange(value as [number, number])
                    }
                    max={maxPrice}
                    step={100}
                    className="mt-4"
                  />
                </div>
              )}

              {/* Rating */}
              <div className="space-y-2">
                <Label>Minimum Rating</Label>
                <Select
                  value={minRating.toString()}
                  onValueChange={(value) => onMinRatingChange(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any Rating</SelectItem>
                    <SelectItem value="3">3+ Stars</SelectItem>
                    <SelectItem value="3.5">3.5+ Stars</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>Difficulty Level</Label>
                <Select
                  value={difficulty || 'all'}
                  onValueChange={(value) =>
                    onDifficultyChange(value === 'all' ? null : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

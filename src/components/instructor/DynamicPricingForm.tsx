import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DynamicPricingFormProps {
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  enrollmentTarget: number;
  dynamicPricingEnabled: boolean;
  currentEnrollments?: number;
  onBasePriceChange: (value: number) => void;
  onMinPriceChange: (value: number) => void;
  onMaxPriceChange: (value: number) => void;
  onEnrollmentTargetChange: (value: number) => void;
  onDynamicPricingChange: (enabled: boolean) => void;
}

export const DynamicPricingForm = ({
  basePrice,
  minPrice,
  maxPrice,
  enrollmentTarget,
  dynamicPricingEnabled,
  currentEnrollments = 0,
  onBasePriceChange,
  onMinPriceChange,
  onMaxPriceChange,
  onEnrollmentTargetChange,
  onDynamicPricingChange,
}: DynamicPricingFormProps) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    // Validate price ranges
    if (minPrice > basePrice) {
      setValidationError('Minimum price cannot be greater than base price');
    } else if (maxPrice < basePrice) {
      setValidationError('Maximum price cannot be less than base price');
    } else if (minPrice < 0 || basePrice < 0 || maxPrice < 0) {
      setValidationError('Prices cannot be negative');
    } else if (minPrice === 0 && maxPrice === 0) {
      setValidationError('Please set valid price ranges');
    } else {
      setValidationError(null);
    }
  }, [minPrice, basePrice, maxPrice]);

  const calculatePriceAtEnrollment = (enrollments: number) => {
    if (!dynamicPricingEnabled) return basePrice;
    const ratio = Math.min(1, enrollments / enrollmentTarget);
    const price = minPrice + (ratio * (maxPrice - minPrice));
    return Math.round(price / 50) * 50; // Round to nearest 50
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ne-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const currentPrice = calculatePriceAtEnrollment(currentEnrollments);
  const demandRatio = Math.min(100, (currentEnrollments / enrollmentTarget) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Dynamic Pricing</CardTitle>
            <CardDescription>
              Set price ranges that adjust automatically based on enrollments
            </CardDescription>
          </div>
          <Switch
            checked={dynamicPricingEnabled}
            onCheckedChange={onDynamicPricingChange}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="base-price">Base Price (NPR) *</Label>
            <Input
              id="base-price"
              type="number"
              min="0"
              step="50"
              value={basePrice}
              onChange={(e) => onBasePriceChange(Number(e.target.value))}
              placeholder="1000"
            />
            <p className="text-xs text-muted-foreground">Your ideal course price</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-price">Minimum Price (NPR) *</Label>
            <Input
              id="min-price"
              type="number"
              min="0"
              step="50"
              value={minPrice}
              onChange={(e) => onMinPriceChange(Number(e.target.value))}
              placeholder="500"
            />
            <p className="text-xs text-muted-foreground">Lowest acceptable price</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-price">Maximum Price (NPR) *</Label>
            <Input
              id="max-price"
              type="number"
              min="0"
              step="50"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(Number(e.target.value))}
              placeholder="1500"
            />
            <p className="text-xs text-muted-foreground">Highest acceptable price</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="enrollment-target">Enrollment Target</Label>
          <Input
            id="enrollment-target"
            type="number"
            min="1"
            value={enrollmentTarget}
            onChange={(e) => onEnrollmentTargetChange(Number(e.target.value) || 100)}
            placeholder="100"
          />
          <p className="text-xs text-muted-foreground">
            Price reaches maximum when enrollments reach this target
          </p>
        </div>

        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {dynamicPricingEnabled && !validationError && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pricing Preview</span>
                <Badge variant="outline">Dynamic Pricing Active</Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-background">
                  <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-bold">{formatPrice(calculatePriceAtEnrollment(0))}</p>
                  <p className="text-xs text-muted-foreground">0 enrollments</p>
                </div>

                <div className="p-3 rounded-lg bg-background">
                  <div className="flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-400 mb-1">
                    <Minus className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-bold">{formatPrice(calculatePriceAtEnrollment(enrollmentTarget / 2))}</p>
                  <p className="text-xs text-muted-foreground">{Math.floor(enrollmentTarget / 2)} enrollments</p>
                </div>

                <div className="p-3 rounded-lg bg-background">
                  <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400 mb-1">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-bold">{formatPrice(calculatePriceAtEnrollment(enrollmentTarget))}</p>
                  <p className="text-xs text-muted-foreground">{enrollmentTarget}+ enrollments</p>
                </div>
              </div>

              {currentEnrollments > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Current demand</span>
                    <span className="font-medium">{currentEnrollments} / {enrollmentTarget}</span>
                  </div>
                  <Progress value={demandRatio} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    Current price: <span className="font-bold">{formatPrice(currentPrice)}</span>
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Price adjusts automatically based on enrollments
              </p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
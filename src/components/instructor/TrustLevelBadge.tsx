import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustLevelBadgeProps {
  trustLevel: string;
  approvedCoursesCount?: number;
  showProgress?: boolean;
  className?: string;
}

export const TrustLevelBadge = ({ 
  trustLevel, 
  approvedCoursesCount = 0,
  showProgress = false,
  className 
}: TrustLevelBadgeProps) => {
  const getBadgeContent = () => {
    switch (trustLevel) {
      case 'verified':
        return {
          icon: Star,
          label: 'Verified Instructor',
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
          iconClassName: 'text-amber-600 dark:text-amber-400'
        };
      case 'trusted':
        return {
          icon: CheckCircle,
          label: 'Trusted Instructor',
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
          iconClassName: 'text-green-600 dark:text-green-400'
        };
      case 'new':
      default:
        return {
          icon: Sparkles,
          label: 'New Instructor',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
          iconClassName: 'text-blue-600 dark:text-blue-400'
        };
    }
  };

  const { icon: Icon, label, className: badgeClassName, iconClassName } = getBadgeContent();
  const coursesUntilTrusted = Math.max(0, 3 - approvedCoursesCount);

  return (
    <div className={cn("space-y-1", className)}>
      <Badge 
        variant="outline" 
        className={cn("gap-1 font-medium", badgeClassName)}
      >
        <Icon className={cn("h-3 w-3", iconClassName)} />
        {label}
      </Badge>
      
      {showProgress && trustLevel === 'new' && (
        <p className="text-xs text-muted-foreground">
          {coursesUntilTrusted > 0 
            ? `${coursesUntilTrusted} more approved course${coursesUntilTrusted > 1 ? 's' : ''} until auto-publish`
            : 'Almost there!'}
        </p>
      )}
      
      {showProgress && trustLevel === 'trusted' && (
        <p className="text-xs text-muted-foreground">
          Auto-publish enabled • {approvedCoursesCount} approved courses
        </p>
      )}
      
      {showProgress && trustLevel === 'verified' && (
        <p className="text-xs text-muted-foreground">
          Verified by admin • {approvedCoursesCount} approved courses
        </p>
      )}
    </div>
  );
};
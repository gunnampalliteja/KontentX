import { Star } from 'lucide-react';
import { cn } from '../../utils';

interface StarRatingProps {
  rating: number;
  size?: number;
  showNumber?: boolean;
  reviewCount?: number;
  className?: string;
}

export default function StarRating({ rating, size = 14, showNumber = true, reviewCount, className }: StarRatingProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);
  
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex items-center">
        {stars.map((star) => (
          <Star
            key={star}
            size={size}
            className={cn(
              star <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-700 fill-gray-700'
            )}
          />
        ))}
      </div>
      {showNumber && (
        <span className="text-sm font-medium text-white">{rating.toFixed(1)}</span>
      )}
      {reviewCount !== undefined && (
        <span className="text-xs text-gray-500">({reviewCount})</span>
      )}
    </div>
  );
}

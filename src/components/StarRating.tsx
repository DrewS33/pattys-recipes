import { useState } from 'react';

// ============================================================
// StarRating: interactive or read-only 1–5 star rating
// ============================================================

interface StarRatingProps {
  rating?: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

export default function StarRating({
  rating,
  onChange,
  size = 'md',
  readOnly = false,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const display = hovered ?? rating ?? 0;

  const sizeClass =
    size === 'sm' ? 'text-sm' :
    size === 'lg' ? 'text-2xl' :
    'text-lg';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          className={`
            ${sizeClass} leading-none transition-transform
            ${!readOnly ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}
            ${star <= display ? 'text-amber-400' : 'text-stone-300'}
          `}
          title={readOnly ? undefined : `Rate ${star} star${star !== 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      {rating !== undefined && !readOnly && (
        <button
          type="button"
          onClick={() => onChange?.(0)}
          className="ml-1 text-xs text-stone-400 hover:text-stone-600 transition-colors"
          title="Clear rating"
        >
          ✕
        </button>
      )}
    </div>
  );
}

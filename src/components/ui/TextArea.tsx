import { forwardRef } from 'react';
import { cn } from '../../utils';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>((
  { label, error, hint, className, ...props },
  ref
) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          'w-full bg-white/5 border rounded-xl text-white placeholder:text-gray-600 text-sm transition-all outline-none px-4 py-3 resize-none',
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
            : 'border-white/10 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-600">{hint}</p>}
    </div>
  );
});

TextArea.displayName = 'TextArea';
export default TextArea;

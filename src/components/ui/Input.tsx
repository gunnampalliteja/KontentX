import { forwardRef } from 'react';
import { cn } from '../../utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>((
  { label, error, icon, iconRight, hint, className, ...props },
  ref
) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-white/5 border rounded-xl text-white placeholder:text-gray-600 text-sm transition-all outline-none',
            'px-4 py-2.5',
            icon && 'pl-10',
            iconRight && 'pr-10',
            error
              ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
              : 'border-white/10 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20',
            className
          )}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500">
            {iconRight}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-600">{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>((
  { variant = 'primary', size = 'md', loading, icon, iconPosition = 'left', children, className, disabled, ...props },
  ref
) => {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed select-none',
        size === 'sm' && 'px-3.5 py-2 text-sm',
        size === 'md' && 'px-5 py-2.5 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        variant === 'primary' && 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98]',
        variant === 'secondary' && 'bg-white/8 text-white border border-white/15 hover:bg-white/12 hover:border-white/20 active:scale-[0.98]',
        variant === 'ghost' && 'text-gray-400 hover:text-white hover:bg-white/5 active:scale-[0.98]',
        variant === 'outline' && 'border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/60 active:scale-[0.98]',
        variant === 'danger' && 'bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 active:scale-[0.98]',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        iconPosition === 'left' && icon
      )}
      {children}
      {!loading && iconPosition === 'right' && icon}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;

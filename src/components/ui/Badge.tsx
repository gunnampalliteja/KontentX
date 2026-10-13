import { cn } from '../../utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'outline' | 'gradient';
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-medium rounded-full border',
      size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      variant === 'default' && 'bg-white/5 text-gray-300 border-white/10',
      variant === 'success' && 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
      variant === 'warning' && 'bg-amber-400/10 text-amber-400 border-amber-400/20',
      variant === 'error' && 'bg-red-400/10 text-red-400 border-red-400/20',
      variant === 'info' && 'bg-sky-400/10 text-sky-400 border-sky-400/20',
      variant === 'purple' && 'bg-purple-400/10 text-purple-400 border-purple-400/20',
      variant === 'outline' && 'bg-transparent text-indigo-400 border-indigo-400/40',
      variant === 'gradient' && 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-300 border-indigo-500/20',
      className
    )}>
      {children}
    </span>
  );
}

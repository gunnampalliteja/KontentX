import { forwardRef } from 'react';
import { cn } from '../../utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>((
  { label, error, options, placeholder, className, ...props },
  ref
) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          'w-full bg-[#13131f] border rounded-xl text-white text-sm transition-all outline-none appearance-none px-4 py-2.5 cursor-pointer',
          error
            ? 'border-red-500/50 focus:border-red-500'
            : 'border-white/10 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20',
          className
        )}
        {...props}
      >
        {placeholder && <option value="" className="text-gray-500">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#13131f] text-white">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;

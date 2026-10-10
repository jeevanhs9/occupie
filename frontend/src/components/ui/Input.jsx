import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function Input({
  label,
  error,
  helperText,
  type = 'text',
  id,
  className = '',
  startIcon: StartIcon,
  showPasswordToggle = false,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const effectiveType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-sm">
        {StartIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <StartIcon className="h-4 w-4" />
          </div>
        )}
        <input
          id={inputId}
          type={effectiveType}
          className={`block w-full rounded-xl border text-sm transition duration-150 py-2.5 bg-white text-slate-900 placeholder:text-slate-400
            ${StartIcon ? 'pl-10' : 'pl-3.5'}
            ${showPasswordToggle ? 'pr-10' : 'pr-3.5'}
            ${error ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-500' : 'border-stone-300 hover:border-occupie-brass-500 focus:border-occupie-brass-500 focus:ring-occupie-brass-500'}
            focus:outline-none focus:ring-2 focus:ring-offset-0
            ${className}`}
          {...props}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}

export default Input;

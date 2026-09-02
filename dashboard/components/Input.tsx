'use client';

import { InputHTMLAttributes, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Only used when `label` is set — className for the label+input
   * wrapper div (e.g. `flex-1` when a labeled input sits in a flex row). */
  wrapperClassName?: string;
}

// No width baked in — callers vary between w-full (forms) and a fixed
// w-72 (search boxes), so that's left for `className` to supply.
const FIELD_CLASSES =
  'rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600';

export function Input({ label, id, className = '', wrapperClassName = '', ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const input = <input id={inputId} className={`${FIELD_CLASSES} ${className}`} {...rest} />;

  if (!label) return input;

  return (
    <div className={wrapperClassName}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {input}
    </div>
  );
}

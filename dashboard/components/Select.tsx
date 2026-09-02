'use client';

import { SelectHTMLAttributes, useId } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  /** Only used when `label` is set — see Input's wrapperClassName. */
  wrapperClassName?: string;
}

const FIELD_CLASSES =
  'rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600';

export function Select({
  label,
  id,
  className = '',
  wrapperClassName = '',
  children,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const select = (
    <select id={selectId} className={`${FIELD_CLASSES} ${className}`} {...rest}>
      {children}
    </select>
  );

  if (!label) return select;

  return (
    <div className={wrapperClassName}>
      <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {select}
    </div>
  );
}

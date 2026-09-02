'use client';

import { TextareaHTMLAttributes, useId } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  /** Only used when `label` is set — see Input's wrapperClassName. */
  wrapperClassName?: string;
}

const FIELD_CLASSES =
  'rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600';

export function Textarea({
  label,
  id,
  className = '',
  wrapperClassName = '',
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const textarea = <textarea id={textareaId} className={`${FIELD_CLASSES} ${className}`} {...rest} />;

  if (!label) return textarea;

  return (
    <div className={wrapperClassName}>
      <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {textarea}
    </div>
  );
}

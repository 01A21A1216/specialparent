'use client';

import type { ReactNode } from 'react';

// Label + optional required marker + slot for the input control. Used
// wherever a form has our standard label style (uppercase eyebrow with
// a coral asterisk on required fields).

export function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-sage-500 uppercase tracking-wider">
        {label}
        {required && <span className="text-coral-500 ml-1">*</span>}
        {hint && <span className="normal-case text-sage-400 ml-1">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

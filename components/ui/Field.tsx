/**
 * Field — accessible form field wrapper.
 *
 * Provides:
 *   - A jtp-label above (uppercase mono, tracked)
 *   - Required indicator (red asterisk)
 *   - Optional hint text below (faint, for guidance)
 *   - Error message below (jtp-loss color, role="alert" for screen readers)
 *   - aria-describedby wired to hint/error ids
 *   - aria-invalid set on the inner input when error is present
 *
 * Usage:
 *   <Field label="ENTRY PRICE" htmlFor="entry-price" required error={errors.entryPrice}>
 *     <Input id="entry-price" type="number" step="0.00001" />
 *   </Field>
 *
 *   <Field label="SETUP NOTES" htmlFor="notes" hint="Optional — explain why you took this trade">
 *     <Textarea id="notes" rows={3} />
 *   </Field>
 */
import React from 'react';

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

const Field: React.FC<FieldProps> = ({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className = '',
}) => {
  const hintId  = hint  && htmlFor ? `${htmlFor}-hint`  : undefined;
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;

  return (
    <div className={`flex flex-col gap-[5px] ${className}`}>
      {/* Label */}
      <label
        htmlFor={htmlFor}
        className="jtp-label"
      >
        {label}
        {required && (
          <span className="text-jtp-loss ml-[3px]" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {/* Input — inject aria props via cloneElement */}
      {React.cloneElement(children as React.ReactElement, {
        'aria-describedby':
          [hintId, errorId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? ('true' as const) : undefined,
        'aria-required': required || undefined,
      })}

      {/* Hint (shown when no error) */}
      {hint && !error && (
        <span id={hintId} className="text-jtp-xs text-jtp-textFaint leading-snug">
          {hint}
        </span>
      )}

      {/* Error */}
      {error && (
        <span
          id={errorId}
          className="text-jtp-xs text-jtp-loss leading-snug animate-jtp-fade-in"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
};

export default Field;

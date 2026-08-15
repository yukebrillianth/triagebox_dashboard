import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/cn';

export type FieldProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
};

type ControlProps = {
  id?: string;
  invalid?: boolean;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
  'aria-required'?: boolean | 'true' | 'false';
};

export function Field({
  label,
  htmlFor,
  required,
  optional,
  error,
  hint,
  children,
  className,
  ...props
}: FieldProps) {
  const uid = useId();
  const controlId = htmlFor ?? `field-${uid}`;
  const errorId = error ? `${controlId}-error` : undefined;
  const hintId = hint && !error ? `${controlId}-hint` : undefined;
  const describedBy = errorId ?? hintId;

  const child = Children.only(children);
  const control = isValidElement(child)
    ? cloneElement(child as ReactElement<ControlProps>, {
        id: (child.props as ControlProps).id ?? controlId,
        invalid: error ? true : (child.props as ControlProps).invalid,
        'aria-invalid': error
          ? true
          : (child.props as ControlProps)['aria-invalid'],
        'aria-describedby':
          describedBy ?? (child.props as ControlProps)['aria-describedby'],
        'aria-required':
          required === true
            ? true
            : (child.props as ControlProps)['aria-required'],
      })
    : children;

  return (
    <div className={cn('space-y-1.5', className)} {...props}>
      <label
        htmlFor={controlId}
        className="text-foreground-soft block text-xs font-medium"
      >
        {label}
        {required ? (
          <span className="text-triage-red-ink ml-1" aria-hidden>
            *
          </span>
        ) : null}
        {optional ? (
          <span className="text-dim ml-1 font-normal">opsional</span>
        ) : null}
      </label>
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-muted text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-triage-red-ink text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

import type { ReactNode } from "react";

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (attributes: {
    describedBy: string | undefined;
    invalid: boolean;
  }) => ReactNode;
}

function FieldShell({
  id,
  label,
  hint,
  error,
  required = false,
  children,
}: FieldShellProps) {
  const describedBy = [
    hint ? `${id}-hint` : undefined,
    error ? `${id}-error` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field-shell">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> (required)</span>}
      </label>
      {children({
        describedBy: describedBy || undefined,
        invalid: Boolean(error),
      })}
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export default FieldShell;

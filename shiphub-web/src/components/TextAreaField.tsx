import FieldShell from "./FieldShell";

interface TextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
}: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      {({ describedBy, invalid }) => (
        <textarea
          id={id}
          name={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          rows={4}
        />
      )}
    </FieldShell>
  );
}

export default TextAreaField;

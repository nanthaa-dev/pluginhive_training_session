import FieldShell from "./FieldShell";

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  autoComplete?: string;
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  required = false,
  autoComplete,
}: TextFieldProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      required={required}
    >
      {({ describedBy, invalid }) => (
        <input
          id={id}
          name={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          autoComplete={autoComplete}
          aria-describedby={describedBy}
          aria-invalid={invalid}
        />
      )}
    </FieldShell>
  );
}

export default TextField;

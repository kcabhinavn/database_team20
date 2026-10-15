import { useId, type ComponentPropsWithRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import styles from './Field.module.css';

interface FieldProps {
  label: string;
  /** Hide the label visually (it stays available to screen readers). */
  hideLabel?: boolean;
  helper?: ReactNode;
  error?: string | null;
  children: (ids: { inputId: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
  className?: string;
}

/** Label above, helper below; an error replaces the helper. */
export function Field({ label, hideLabel, helper, error, children, className }: FieldProps) {
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const message = error ?? helper;
  return (
    <div className={[styles.field, className ?? ''].join(' ')}>
      <label htmlFor={inputId} className={hideLabel ? 'visually-hidden' : styles.label}>
        {label}
      </label>
      {children({ inputId, describedBy: message ? messageId : undefined, invalid: Boolean(error) })}
      {message ? (
        <p id={messageId} className={error ? styles.error : styles.helper} role={error ? 'alert' : undefined}>
          {error ? `⚠ ${error}` : helper}
        </p>
      ) : null}
    </div>
  );
}

interface TextInputProps extends Omit<ComponentPropsWithRef<'input'>, 'id' | 'prefix'> {
  label: string;
  hideLabel?: boolean;
  helper?: ReactNode;
  error?: string | null;
  prefix?: string;
  fieldClassName?: string;
}

export function TextInput({ label, hideLabel, helper, error, prefix, fieldClassName, className, ...rest }: TextInputProps) {
  return (
    <Field label={label} hideLabel={hideLabel} helper={helper} error={error} className={fieldClassName}>
      {({ inputId, describedBy, invalid }) => (
        <div className={[styles.control, invalid ? styles.invalid : '', rest.readOnly ? styles.readonly : ''].join(' ')}>
          {prefix ? <span className={styles.prefix}>{prefix}</span> : null}
          <input
            id={inputId}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={[styles.input, className ?? ''].join(' ')}
            {...rest}
          />
        </div>
      )}
    </Field>
  );
}

interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  hideLabel?: boolean;
  options: { value: string; label: string }[];
  fieldClassName?: string;
}

export function SelectInput({ label, hideLabel, options, fieldClassName, className, ...rest }: SelectInputProps) {
  return (
    <Field label={label} hideLabel={hideLabel} className={fieldClassName}>
      {({ inputId }) => (
        <div className={styles.control}>
          <select id={inputId} className={[styles.input, styles.select, className ?? ''].join(' ')} {...rest}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </Field>
  );
}

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-osso/15 bg-carvao/60 px-4 text-osso placeholder:text-fumaca/70 transition-colors focus:border-brasa focus:outline-none aria-[invalid=true]:border-sangue";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, hint, className, id, ...props }, ref) {
  const auto = useId();
  const fieldId = id ?? auto;
  const describedBy = error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-osso/90">
        {label}
      </label>
      <input ref={ref} id={fieldId} aria-invalid={!!error} aria-describedby={describedBy} className={cn(control, "h-12")} {...props} />
      {error ? (
        <p id={`${fieldId}-err`} className="text-sm text-[#ff8a70]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-fumaca">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({ label, error, className, id, ...props }, ref) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-osso/90">
        {label}
      </label>
      <textarea ref={ref} id={fieldId} aria-invalid={!!error} className={cn(control, "min-h-24 py-3")} {...props} />
      {error && (
        <p className="text-sm text-[#ff8a70]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, error, className, id, children, ...props }, ref) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-osso/90">
        {label}
      </label>
      <select ref={ref} id={fieldId} aria-invalid={!!error} className={cn(control, "h-12 appearance-none bg-fuligem")} {...props}>
        {children}
      </select>
      {error && (
        <p className="text-sm text-[#ff8a70]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

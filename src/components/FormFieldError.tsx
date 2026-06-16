interface FormFieldErrorProps {
  error?: string | null;
  touched?: boolean;
}

export const FormFieldError = ({ error, touched }: FormFieldErrorProps) => {
  if (!touched || !error) return null;
  return (
    <p className="mt-1 text-xs text-destructive font-medium">{error}</p>
  );
};

export default FormFieldError;

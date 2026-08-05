type FormErrorSummaryProps = {
  errors: { targetId: string; message: string }[];
};

/**
 * A summary of the current field errors, rendered inside the form's alert
 * region so assistive technology announces it. Each entry links to the field
 * it describes; the same message also appears beside that field.
 */
export function FormErrorSummary({ errors }: FormErrorSummaryProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="form-error-summary">
      <p className="form-error-summary__title">
        {errors.length === 1
          ? "Fix this before saving:"
          : `Fix these ${errors.length} details before saving:`}
      </p>
      <ul>
        {errors.map((error) => (
          <li key={`${error.targetId}-${error.message}`}>
            <a href={`#${error.targetId}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

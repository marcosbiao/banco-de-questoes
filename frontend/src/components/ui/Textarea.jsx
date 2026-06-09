export default function Textarea({ label, id, className = '', inputClassName = '', rows = 4, requiredMark = false, ...props }) {
  const textareaId = id || props.name;

  return (
    <label className={`field ${className}`} htmlFor={textareaId}>
      <span>
        {label}
        {requiredMark ? <span className="required-mark"> *</span> : null}
      </span>
      <textarea id={textareaId} className={`input textarea ${inputClassName}`} rows={rows} {...props} />
    </label>
  );
}

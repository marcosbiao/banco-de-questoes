export default function Input({ label, id, className = '', requiredMark = false, ...props }) {
  const inputId = id || props.name;

  return (
    <label className={`field ${className}`} htmlFor={inputId}>
      <span>
        {label}
        {requiredMark ? <span className="required-mark"> *</span> : null}
      </span>
      <input id={inputId} className="input" {...props} />
    </label>
  );
}

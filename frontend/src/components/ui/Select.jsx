export default function Select({ label, id, options = [], placeholder = 'Selecione', className = '', requiredMark = false, ...props }) {
  const selectId = id || props.name;

  return (
    <label className={`field ${className}`} htmlFor={selectId}>
      <span>
        {label}
        {requiredMark ? <span className="required-mark"> *</span> : null}
      </span>
      <select id={selectId} className="input" {...props}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Button({
  children,
  className = '',
  icon: Icon,
  variant = 'primary',
  size = 'md',
  ...props
}) {
  return (
    <button className={`button button-${variant} button-${size} ${className}`} {...props}>
      {Icon ? <Icon size={18} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}

import Button from './Button.jsx';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmVariant,
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) {
    return null;
  }

  const descriptionContent = typeof description === 'string'
    ? <p>{description}</p>
    : <div className="confirm-dialog-description">{description}</div>;

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <div>
          <h3 id="confirm-dialog-title">{title}</h3>
          {description ? descriptionContent : null}
        </div>

        <div className="dialog-actions">
          <Button type="button" variant="secondary" disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={confirmVariant || (danger ? 'danger' : 'primary')} disabled={loading} onClick={onConfirm}>
            {loading ? 'Processando...' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

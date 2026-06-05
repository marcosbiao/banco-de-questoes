import Button from './Button.jsx';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <div>
          <h3 id="confirm-dialog-title">{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>

        <div className="dialog-actions">
          <Button type="button" variant="secondary" disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={danger ? 'danger' : 'primary'} disabled={loading} onClick={onConfirm}>
            {loading ? 'Processando...' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

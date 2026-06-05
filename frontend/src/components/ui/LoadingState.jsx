export default function LoadingState({ message = 'Carregando...' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-dot" aria-hidden="true" />
      <strong>{message}</strong>
    </div>
  );
}

import { Inbox } from 'lucide-react';

export default function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <Inbox size={32} aria-hidden="true" />
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

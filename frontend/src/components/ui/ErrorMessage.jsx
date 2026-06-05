export default function ErrorMessage({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div className="message-box message-box-error" role="alert">
      {message}
    </div>
  );
}

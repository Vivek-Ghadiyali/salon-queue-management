export default function FeedbackToast({ message }) {
  if (!message) return null;
  return <div className="feedback-toast" role="status" aria-live="polite">{message}</div>;
}

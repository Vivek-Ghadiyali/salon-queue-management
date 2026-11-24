import { useCallback, useEffect, useRef, useState } from 'react';

export default function usePreviewFeedback() {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef(null);

  const notify = useCallback((nextMessage) => {
    window.clearTimeout(timeoutRef.current);
    setMessage(nextMessage);
    timeoutRef.current = window.setTimeout(() => setMessage(''), 4200);
  }, []);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  return { message, notify };
}

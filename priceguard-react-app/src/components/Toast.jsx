import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);
  return { toasts, add };
}

export function ToastContainer({ toasts }) {
  return (
    <div className="toasts">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span style={{ marginRight: 7 }}>
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✗' : '⚠'}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

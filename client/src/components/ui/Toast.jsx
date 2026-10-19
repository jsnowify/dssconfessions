import { useEffect } from "react";

const Toast = ({ message, show, onClose }) => {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [show, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-transform duration-300 ${
        show
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="toast-body px-6 py-3.5 rounded-xl font-bold border-2 border-(--ink) shadow-[4px_4px_0_var(--mustard)] flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-(--mustard) shrink-0" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
};

export default Toast;
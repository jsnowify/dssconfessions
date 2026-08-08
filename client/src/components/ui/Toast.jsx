import { useEffect } from "react";

const Toast = ({ message, show, onClose }) => {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [show, onClose]);

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        show
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="bg-black text-white px-6 py-4 rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] border-2 border-black flex items-center gap-3">
        <span className="text-lg">⚠️</span>
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
};

export default Toast;

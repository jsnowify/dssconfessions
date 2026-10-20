export default function PageLink({ href, view, setView, className = "", children }) {
  return (
    <a
      href={href}
      className={`inline-flex min-h-11 min-w-11 items-center ${className}`}
      onClick={(event) => {
        if (!setView || event.defaultPrevented || event.button !== 0 ||
            event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        setView(view);
      }}
    >
      {children}
    </a>
  );
}

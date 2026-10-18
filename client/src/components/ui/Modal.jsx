import { useEffect, useId, useRef } from "react";

export default function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = ref.current;
    if (!dialog) return;

    // Lock page behind modal from scrolling without layout shift
    const scrollY = window.scrollY;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;
    const prevPaddingRight = document.body.style.paddingRight;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    dialog.showModal();

    // Explicitly mark the background for assistive tools as well as the native
    // dialog's implicit inert behavior. Never hide an ancestor of this dialog.
    const background = [];
    let branch = dialog;
    while (branch.parentElement && branch !== document.body) {
      for (const sibling of branch.parentElement.children) {
        if (sibling === branch) continue;
        background.push([
          sibling,
          sibling.getAttribute("aria-hidden"),
          sibling.hasAttribute("inert"),
        ]);
        sibling.setAttribute("aria-hidden", "true");
        sibling.setAttribute("inert", "");
      }
      branch = branch.parentElement;
    }

    const trap = (event) => {
      if (event.key !== "Tab") return;
      const nodes = [
        ...dialog.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
        ),
      ].filter((node) => node.getClientRects().length);
      if (!nodes.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", trap);

    return () => {
      dialog.removeEventListener("keydown", trap);
      dialog.close();
      for (const [node, hidden, inert] of background) {
        if (hidden === null) node.removeAttribute("aria-hidden");
        else node.setAttribute("aria-hidden", hidden);
        if (!inert) node.removeAttribute("inert");
      }
      if (trigger?.isConnected) trigger.focus();

      // Restore exact scroll position and remove body lock with zero layout shift
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      document.body.style.paddingRight = prevPaddingRight;
      window.scrollTo({ top: scrollY, behavior: "instant" });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="feature-modal sleeve-panel no-scrollbar scroll-fade-hints"
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-header flex items-start justify-between gap-4 mb-5">
        <h2 id={titleId} className="text-2xl font-bold">
          {title}
        </h2>
        <button
          type="button"
          className="text-action shrink-0"
          aria-label={`Close ${title}`}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}

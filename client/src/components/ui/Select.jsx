import { useState, useRef, useEffect, useId, useCallback } from "react";

export default function Select({
  id: customId,
  name,
  label,
  options = [],
  value = "",
  onChange,
  placeholder = "Select an option...",
  required = false,
  disabled = false,
  error = "",
}) {
  const generatedId = useId();
  const id = customId || `select-${generatedId}`;
  const listboxId = `${id}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(pointer: coarse)")?.matches),
  );

  const triggerRef = useRef(null);
  const listboxRef = useRef(null);
  const typeaheadBuffer = useRef("");
  const typeaheadTimeout = useRef(null);

  // Detect coarse pointer (touch devices) for native OS picker fallback
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const handler = (e) => setIsCoarsePointer(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  // Position calculation with auto-flip
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(280, options.length * 48 + 16);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldFlip = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    setIsFlipped(shouldFlip);
  }, [options.length]);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    updatePosition();
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  }, [disabled, selectedIndex, updatePosition]);

  const toggleDropdown = useCallback(() => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
    } else {
      openDropdown();
    }
  }, [disabled, isOpen, openDropdown]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("scroll", updatePosition, { capture: true, passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });
    return () => {
      window.removeEventListener("scroll", updatePosition, { capture: true });
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        listboxRef.current?.contains(e.target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Scroll active option into view
  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !listboxRef.current) return;
    const activeEl = listboxRef.current.children[activeIndex];
    if (activeEl && typeof activeEl.scrollIntoView === "function") {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [isOpen, activeIndex]);

  const selectOption = (opt) => {
    if (opt.disabled || disabled) return;
    if (typeof onChange === "function") {
      onChange(opt.value);
    }
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === "Tab") {
      setIsOpen(false);
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < options.length) {
        selectOption(options[activeIndex]);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      let nextIndex = activeIndex + 1;
      while (nextIndex < options.length && options[nextIndex]?.disabled) {
        nextIndex++;
      }
      if (nextIndex < options.length) setActiveIndex(nextIndex);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      let prevIndex = activeIndex - 1;
      while (prevIndex >= 0 && options[prevIndex]?.disabled) {
        prevIndex--;
      }
      if (prevIndex >= 0) setActiveIndex(prevIndex);
      return;
    }

    if (e.key === "Home") {
      e.preventDefault();
      const firstEnabled = options.findIndex((opt) => !opt.disabled);
      if (firstEnabled >= 0) setActiveIndex(firstEnabled);
      return;
    }

    if (e.key === "End") {
      e.preventDefault();
      for (let i = options.length - 1; i >= 0; i--) {
        if (!options[i].disabled) {
          setActiveIndex(i);
          break;
        }
      }
      return;
    }

    // Typeahead buffer
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      clearTimeout(typeaheadTimeout.current);
      typeaheadBuffer.current += e.key.toLowerCase();
      typeaheadTimeout.current = setTimeout(() => {
        typeaheadBuffer.current = "";
      }, 500);

      const matchIndex = options.findIndex(
        (opt) =>
          !opt.disabled &&
          opt.label.toLowerCase().startsWith(typeaheadBuffer.current),
      );
      if (matchIndex >= 0) setActiveIndex(matchIndex);
    }
  };

  // Coarse pointer (mobile touch) native picker
  if (isCoarsePointer) {
    return (
      <div className="custom-select-wrapper w-full">
        {name && <input type="hidden" name={name} value={value} />}
        {label && (
          <label
            htmlFor={id}
            className="block text-xs font-bold uppercase tracking-wider text-[var(--ink)] mb-1.5"
          >
            {label}{" "}
            {required && <span className="text-[var(--coral)]">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            id={id}
            value={value}
            disabled={disabled}
            required={required}
            onChange={(e) => {
              if (typeof onChange === "function") onChange(e.target.value);
            }}
            className={`w-full appearance-none bg-[var(--surface)] border-2 border-[var(--ink)] p-3.5 pr-10 rounded-xl font-bold text-sm text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed ${
              error ? "border-[var(--coral)]" : ""
            }`}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[var(--ink)]">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="mt-1 text-xs font-bold text-[var(--coral)]">{error}</p>
        )}
      </div>
    );
  }

  const activeOptionId =
    activeIndex >= 0 && options[activeIndex]
      ? `${id}-opt-${activeIndex}`
      : undefined;

  return (
    <div className="custom-select-wrapper w-full relative">
      {name && <input type="hidden" name={name} value={value} />}
      {label && (
        <label
          id={`${id}-label`}
          htmlFor={id}
          className="block text-xs font-bold uppercase tracking-wider text-[var(--ink)] mb-1.5"
        >
          {label} {required && <span className="text-[var(--coral)]">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={isOpen ? activeOptionId : undefined}
        aria-labelledby={label ? `${id}-label ${id}` : undefined}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between bg-[var(--surface)] border-2 border-[var(--ink)] p-3.5 rounded-xl font-bold text-sm text-[var(--ink)] text-left shadow-[3px_3px_0_var(--ink)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--ink)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? "border-[var(--coral)]" : ""
        }`}
      >
        <span className={selectedOption ? "" : "text-[var(--ink-soft)]/70 font-normal"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 ml-2 transition-transform duration-200 text-[var(--ink)] ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {error && (
        <p className="mt-1 text-xs font-bold text-[var(--coral)]">{error}</p>
      )}

      {/* Dropdown Listbox */}
      {isOpen && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={label ? `${id}-label` : undefined}
          tabIndex={-1}
          style={{ maxHeight: "280px" }}
          className={`custom-select-list no-scrollbar scroll-fade-hints absolute left-0 w-full z-50 bg-[var(--surface)] border-2 border-[var(--ink)] rounded-xl shadow-[4px_4px_0_var(--ink)] overflow-y-auto py-1.5 focus:outline-none animate-fade-in ${
            isFlipped ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isActive = idx === activeIndex;
              return (
                <li
                  key={opt.value}
                  id={`${id}-opt-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled}
                  onClick={() => selectOption(opt)}
                  onMouseEnter={() => !opt.disabled && setActiveIndex(idx)}
                  className={`px-3.5 py-2.5 text-sm font-bold flex items-center justify-between cursor-pointer transition-colors ${
                    opt.disabled
                      ? "opacity-40 cursor-not-allowed"
                      : isSelected
                        ? "bg-[var(--butter)] text-[var(--ink)]"
                        : isActive
                          ? "bg-[var(--bg-wash)] text-[var(--ink)]"
                          : "text-[var(--ink)] hover:bg-[var(--bg-wash)]"
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="truncate">{opt.label}</span>
                    {opt.description && (
                      <span className="text-xs font-normal text-[var(--ink-soft)] truncate">
                        {opt.description}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0 text-[var(--primary)]"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}

import { useEffect, useRef } from "react";
import { MenuIcon } from "../icons/Index";
import Logo from "../ui/Logo";

const NAV_ITEMS = [
  { id: "home", label: "HOME", href: "/" },
  { id: "browse", label: "BROWSE", href: "/browse" },
  { id: "submit", label: "CONFESS", href: "/confess" },
  { id: "about", label: "ABOUT", href: "/about" },
  { id: "faq", label: "FAQ", href: "/faq" },
];

const Navbar = ({ view, setView, isMenuOpen, setIsMenuOpen }) => {
  const toggle = useRef(null);
  const sheet = useRef(null);
  useEffect(() => {
    if (!isMenuOpen) return;
    sheet.current?.querySelector("a, button")?.focus();
    const close = (event) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [isMenuOpen, setIsMenuOpen]);
  return (
    <nav aria-label="Main navigation" className="site-header z-50">
      <div className="nav-inner">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setView("home");
            setIsMenuOpen(false);
          }}
          aria-label="dssconfessions home"
          className="site-logo no-underline flex items-center"
        >
          <Logo variant="header" />
        </a>
        <div className="desktop-nav">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                setView(item.id);
              }}
              aria-current={view === item.id ? "page" : undefined}
              className="nav-link text-sm font-bold inline-flex items-center justify-center no-underline"
            >
              {item.label}
            </a>
          ))}
        </div>
        <button
          ref={toggle}
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          className="menu-toggle cursor-pointer"
        >
          <MenuIcon />
        </button>
      </div>
      {isMenuOpen && (
        <div ref={sheet} id="mobile-navigation" className="mobile-menu">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                setView(item.id);
                setIsMenuOpen(false);
                toggle.current?.focus();
              }}
              aria-current={view === item.id ? "page" : undefined}
              className="nav-link text-left font-bold text-sm block no-underline"
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
};
export default Navbar;

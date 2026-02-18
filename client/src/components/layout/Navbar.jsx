import { MenuIcon } from "../icons/Index";

const Navbar = ({ view, setView, isMenuOpen, setIsMenuOpen }) => (
  <nav className="fixed top-0 w-full bg-white border-b-2 border-black z-50 h-20 px-6">
    <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
      <div
        onClick={() => {
          setView("home");
          setIsMenuOpen(false);
        }}
        className="font-script font-bold cursor-pointer text-3xl"
      >
        dssconfessions
      </div>

      {/* DESKTOP NAV */}
      <div className="hidden md:flex gap-8 items-center font-bold uppercase tracking-widest text-sm">
        {["home", "browse", "submit", "about"].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={
              view === v
                ? "underline underline-offset-8 decoration-2"
                : "text-zinc-400 hover:text-black"
            }
          >
            {v === "submit" ? "CONFESS" : v.toUpperCase()}
          </button>
        ))}
      </div>

      {/* MOBILE HAMBURGER */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="md:hidden p-2"
      >
        <MenuIcon />
      </button>
    </div>

    {/* MOBILE MENU */}
    {isMenuOpen && (
      <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b-2 border-black p-6 flex flex-col gap-4 z-50 animate-fade-in shadow-xl">
        {["home", "browse", "submit", "about"].map((v) => (
          <button
            key={v}
            onClick={() => {
              setView(v);
              setIsMenuOpen(false);
            }}
            className={`text-left font-bold uppercase ${view === v ? "text-black" : "text-zinc-400"}`}
          >
            {v === "submit" ? "CONFESS" : v.toUpperCase()}
          </button>
        ))}
      </div>
    )}
  </nav>
);

export default Navbar;

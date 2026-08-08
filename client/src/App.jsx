import { useState, useEffect } from "react";
import Navbar from "./components/layout/Navbar";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import HomeView from "./views/HomeView";
import BrowseView from "./views/Browseview";
import SubmitView from "./views/SubmitView";
import AboutView from "./views/AboutView";
import DetailsView from "./views/DetailsView";
import { useConfessions } from "./hooks";

export default function App() {
  const [view, setView] = useState(
    () => localStorage.getItem("dssc_view") || "home",
  );
  const [selectedConfession, setSelectedConfession] = useState(
    () => JSON.parse(localStorage.getItem("dssc_selected")) || null,
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const {
    feed,
    isFeedLoading,
    fetchFeed,
    submitConfession,
    searchConfessions,
  } = useConfessions();

  useEffect(() => {
    localStorage.setItem("dssc_view", view);
    localStorage.setItem("dssc_selected", JSON.stringify(selectedConfession));
  }, [view, selectedConfession]);

  const handleSelectConfession = (confession) => {
    setSelectedConfession(confession);
    setView("details");
  };

  return (
    // min-h-screen + flex flex-col: makes the page at least as tall as the
    // viewport and stacks navbar/main/footer vertically, so the footer
    // never floats up when a view (like Browse before a search) is short.
    <div className="min-h-screen flex flex-col bg-white text-black font-sans selection:bg-black selection:text-white overflow-x-hidden">
      {view !== "details" && (
        <Navbar
          view={view}
          setView={setView}
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
        />
      )}

      {/* flex-1: lets main grow to fill any leftover vertical space,
          pushing the footer down to the bottom of the viewport. */}
      <main className={`flex-1 ${view === "details" ? "" : "pt-32 pb-20"}`}>
        <ErrorBoundary key={view}>
          {view === "home" && (
            <HomeView
              feed={feed}
              isFeedLoading={isFeedLoading}
              onSelectConfession={handleSelectConfession}
              setView={setView}
            />
          )}
          {view === "browse" && (
            <BrowseView
              onSelectConfession={handleSelectConfession}
              searchConfessions={searchConfessions}
            />
          )}
          {view === "submit" && (
            <SubmitView
              submitConfession={submitConfession}
              fetchFeed={fetchFeed}
              setView={setView}
            />
          )}
          {view === "about" && <AboutView />}
          {view === "details" && (
            <DetailsView
              selectedConfession={selectedConfession}
              setView={setView}
            />
          )}
        </ErrorBoundary>
      </main>

      <footer className="h-24 flex items-center justify-center border-t-2 border-black font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
        DSSCONFESSIONS © 2026
      </footer>
    </div>
  );
}

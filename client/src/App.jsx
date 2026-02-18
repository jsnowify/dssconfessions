import { useState, useEffect } from "react";
import Navbar from "./components/layout/Navbar";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import HomeView from "./views/HomeView";
import BrowseView from "./views/BrowseView";
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
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white overflow-x-hidden">
      {/* NAVBAR */}
      {view !== "details" && (
        <Navbar
          view={view}
          setView={setView}
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
        />
      )}

      <main className={view === "details" ? "" : "pt-32 pb-20"}>
        <ErrorBoundary key={view}>
          {view === "home" && (
            <HomeView
              feed={feed}
              isFeedLoading={isFeedLoading}
              onSelectConfession={handleSelectConfession}
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

      <footer className="text-center py-12 border-t-2 border-black font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
        DSSCONFESSIONS © 2026
      </footer>
    </div>
  );
}

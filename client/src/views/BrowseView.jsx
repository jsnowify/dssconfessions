import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { fetchTopSearches } from "../hooks";
import Vinyl from "../components/ui/Vinyl";
import { ConfessionCard } from "../components/ui/ConfessionCard";
import { SearchIcon } from "../components/icons/Index";
import Doodle from "../components/ui/Doodle";

const BrowseView = ({
  onSelectConfession,
  searchConfessions,
  initialQuery = "",
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [topSearches, setTopSearches] = useState([]);
  const searchAbortRef = useRef(null);

  // Trending searches loader
  useEffect(() => {
    const controller = new AbortController();
    const loadTrends = async () => {
      try {
        const terms = await fetchTopSearches(controller.signal);
        if (!controller.signal.aborted) setTopSearches(terms);
      } catch {
        // Keep normal state if trends cannot load
      }
    };
    void loadTrends();
    return () => controller.abort();
  }, []);

  const executeSearch = useCallback(
    async (queryToUse) => {
      const rawTerm = typeof queryToUse === "string" ? queryToUse : "";
      const term = rawTerm.trim().slice(0, 50);
      if (!term) return;

      // Cancel any previous in-flight search to eliminate race conditions
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      const controller = new AbortController();
      searchAbortRef.current = controller;

      // Reflect search in URL for bookmarking, refresh, and back button
      const newUrl = `/browse?to=${encodeURIComponent(term)}`;
      if (window.location.pathname + window.location.search !== newUrl) {
        window.history.replaceState(
          { ...window.history.state, view: "browse", query: term },
          "",
          newUrl,
        );
      }

      setIsLoading(true);
      setSearchError(null);
      try {
        const results = await searchConfessions(term, controller.signal);
        if (!controller.signal.aborted) {
          setSearchResults(results);
          setHasSearched(true);
        }
      } catch (e) {
        if (
          axios.isCancel(e) ||
          e.name === "AbortError" ||
          e.name === "CanceledError"
        ) {
          return; // Stale request was canceled; do not overwrite UI
        }
        console.error("Search Error", e);
        setSearchError(
          e.response?.data?.error ||
            "Search is unavailable. Please try again shortly.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [searchConfessions],
  );

  // Run search if an initial query was passed (from URL or back nav)
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setSearchQuery(initialQuery);
      executeSearch(initialQuery);
    }
    return () => {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
    };
  }, [initialQuery, executeSearch]);

  const handleChipClick = (name) => {
    setSearchQuery(name);
    executeSearch(name);
  };

  return (
    <div className="browse-view max-w-6xl mx-auto px-6 text-center">
      <h1 className="browse-title text-5xl md:text-6xl font-script mb-8 font-bold">
        Browse
      </h1>
      <label
        htmlFor="browse-search-input"
        className="block text-sm font-bold mb-3"
      >
        Recipient name
      </label>
      <div className="browse-search max-w-2xl mx-auto">
        <div className="browse-input relative flex-1 min-w-0">
          <span aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            id="browse-search-input"
            className="input w-full h-14 px-5 font-bold placeholder:font-normal"
            placeholder="Search by recipient name..."
            aria-label="Search confessions by recipient name"
            maxLength={50}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && executeSearch(searchQuery)}
          />
        </div>
        <button
          type="button"
          onClick={() => executeSearch(searchQuery)}
          disabled={isLoading}
          className="btn btn-ink h-14 px-8 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 shrink-0"
        >
          <SearchIcon />
          <span>{isLoading ? "Searching..." : "Search"}</span>
        </button>
      </div>
      <p className="browse-helper">
        Search a name to find confessions meant for them.
      </p>
      <div className="browse-results">
        {isLoading ? (
          <div role="status" className="col-span-full py-8 w-full">
            <p className="muted-on-dark font-bold mb-6">
              Searching for whispered letters...
            </p>
            <div
              className="flex flex-wrap justify-center gap-6"
              aria-hidden="true"
            >
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="skeleton-sleeve sleeve-panel w-64 max-w-full"
                >
                  <Vinyl size="120px" />
                </div>
              ))}
            </div>
          </div>
        ) : searchError ? (
          <div role="alert" className="col-span-full py-16">
            <p className="error-on-dark font-medium mb-4">{searchError}</p>
            <button
              type="button"
              onClick={() => executeSearch(searchQuery)}
              className="btn btn-paper px-6 py-3 text-[13px] uppercase font-bold tracking-wider"
            >
              Try Again
            </button>
          </div>
        ) : hasSearched && searchResults.length > 0 ? (
          <>
            <p className="result-count">
              {searchResults.length}{" "}
              {searchResults.length === 1 ? "confession" : "confessions"} for{" "}
              {searchQuery}
            </p>
            <div className="pinboard">
              {searchResults.map((c) => (
                <ConfessionCard
                  key={c.id}
                  data={c}
                  onClick={() =>
                    onSelectConfession(c, {
                      fromView: "browse",
                      fromQuery: searchQuery,
                    })
                  }
                />
              ))}
            </div>
          </>
        ) : hasSearched ? (
          <div className="state-panel col-span-full py-16 muted-on-dark">
            <Vinyl size="100px" />
            <p className="text-lg font-medium mb-2">
              No songs sent to that name yet.
            </p>
            <p className="text-sm">
              No confessions found for &quot;{searchQuery}&quot;. Someone might
              still be writing it.
            </p>
          </div>
        ) : (
          <div className="empty-state col-span-full py-12 flex flex-col items-center gap-4">
            <div
              className="empty-state-icon w-16 h-16 flex items-center justify-center"
              aria-hidden="true"
            >
              <SearchIcon />
            </div>
            <p className="font-medium text-base">
              Type a name above to browse confessions.
            </p>
            {topSearches.length > 0 ? (
              <section
                aria-label="Trending searches"
                className="mt-2 max-w-2xl"
              >
                <p className="chart-label text-[13px] font-bold tracking-widest mb-4">
                  <Doodle /> TOP CHARTS
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {topSearches.map(({ term }, index) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleChipClick(term)}
                      className="chip font-bold capitalize"
                      style={{
                        "--chip": `var(--${["sky", "mint", "lilac", "peach", "butter", "pink"][index % 6]})`,
                      }}
                    >
                      <span className="chart-number">{index + 1}.</span>
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseView;

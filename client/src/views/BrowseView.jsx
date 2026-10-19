import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { fetchTopSearches, fetchArchiveConfessions } from "../hooks";
import Vinyl from "../components/ui/Vinyl";
import { ConfessionCard } from "../components/ui/ConfessionCard";
import { SearchIcon } from "../components/icons/Index";
import Doodle from "../components/ui/Doodle";
import ReaderFontToggle from "../components/ui/ReaderFontToggle";

// Lightweight module-level cache to preserve pagination state and avoid scroll jump on back navigation
let cachedArchive = {
  items: [],
  hasMore: true,
  loaded: false,
};

let cachedSearch = {
  query: "",
  results: [],
  hasMore: false,
};

const BrowseView = ({
  onSelectConfession,
  searchConfessions,
  initialQuery = "",
}) => {
  const isCachedSearch = Boolean(
    initialQuery &&
      initialQuery.trim() === cachedSearch.query &&
      cachedSearch.results.length > 0,
  );

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState(
    isCachedSearch ? cachedSearch.results : [],
  );
  const [searchHasMore, setSearchHasMore] = useState(
    isCachedSearch ? cachedSearch.hasMore : false,
  );
  const [isLoadingMoreSearch, setIsLoadingMoreSearch] = useState(false);
  const [searchLoadMoreError, setSearchLoadMoreError] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(isCachedSearch);
  const [searchError, setSearchError] = useState(null);
  const [topSearches, setTopSearches] = useState([]);

  // Archive feed state for browsing without a search filter
  const [archiveItems, setArchiveItems] = useState(cachedArchive.items);
  const [isArchiveLoading, setIsArchiveLoading] = useState(
    !cachedArchive.loaded,
  );
  const [archiveError, setArchiveError] = useState(null);
  const [archiveHasMore, setArchiveHasMore] = useState(cachedArchive.hasMore);
  const [isLoadingMoreArchive, setIsLoadingMoreArchive] = useState(false);
  const [archiveLoadMoreError, setArchiveLoadMoreError] = useState(null);

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

  // Initial archive loader (runs when not searching)
  const loadInitialArchive = useCallback(async (signal) => {
    if (cachedArchive.loaded && cachedArchive.items.length > 0) {
      setArchiveItems(cachedArchive.items);
      setArchiveHasMore(cachedArchive.hasMore);
      setIsArchiveLoading(false);
      return;
    }
    setIsArchiveLoading(true);
    setArchiveError(null);
    try {
      const items = await fetchArchiveConfessions({ limit: 20, signal });
      const hasMore = items.length >= 20;
      cachedArchive = {
        items,
        hasMore,
        loaded: true,
      };
      setArchiveItems(items);
      setArchiveHasMore(hasMore);
    } catch (e) {
      if (axios.isCancel(e) || e.name === "AbortError") return;
      console.error("Archive Load Error", e);
      setArchiveError("Unable to load the crate archive. Tap to retry.");
    } finally {
      setIsArchiveLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (!initialQuery) {
      void loadInitialArchive(controller.signal);
    }
    return () => controller.abort();
  }, [initialQuery, loadInitialArchive]);

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
      setSearchLoadMoreError(null);
      try {
        const results = await searchConfessions(term, {
          limit: 20,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          const hasMore = results.length >= 20;
          setSearchResults(results);
          setSearchHasMore(hasMore);
          setHasSearched(true);
          cachedSearch = {
            query: term,
            results,
            hasMore,
          };
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

  const loadMoreSearch = useCallback(async () => {
    if (isLoadingMoreSearch || !searchHasMore || searchResults.length === 0)
      return;
    const lastItem = searchResults[searchResults.length - 1];
    if (!lastItem?.created_at) return;

    setIsLoadingMoreSearch(true);
    setSearchLoadMoreError(null);
    try {
      const moreItems = await searchConfessions(searchQuery.trim(), {
        before: lastItem.created_at,
        limit: 20,
      });
      const hasMore = moreItems.length >= 20;
      setSearchHasMore(hasMore);
      setSearchResults((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const unique = moreItems.filter((c) => !existingIds.has(c.id));
        const updated = [...prev, ...unique];
        cachedSearch = {
          query: searchQuery.trim(),
          results: updated,
          hasMore,
        };
        return updated;
      });
    } catch (e) {
      console.error("Load More Search Error", e);
      setSearchLoadMoreError("Could not unpack older stories. Tap to retry.");
    } finally {
      setIsLoadingMoreSearch(false);
    }
  }, [
    isLoadingMoreSearch,
    searchHasMore,
    searchResults,
    searchConfessions,
    searchQuery,
  ]);

  const loadMoreArchive = useCallback(async () => {
    if (isLoadingMoreArchive || !archiveHasMore || archiveItems.length === 0)
      return;
    const lastItem = archiveItems[archiveItems.length - 1];
    if (!lastItem?.created_at) return;

    setIsLoadingMoreArchive(true);
    setArchiveLoadMoreError(null);
    try {
      const moreItems = await fetchArchiveConfessions({
        before: lastItem.created_at,
        limit: 20,
      });
      const hasMore = moreItems.length >= 20;
      setArchiveHasMore(hasMore);
      setArchiveItems((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const unique = moreItems.filter((c) => !existingIds.has(c.id));
        const updated = [...prev, ...unique];
        cachedArchive = {
          items: updated,
          hasMore,
          loaded: true,
        };
        return updated;
      });
    } catch (e) {
      console.error("Load More Archive Error", e);
      setArchiveLoadMoreError(
        "Could not unpack older archive stories. Tap to retry.",
      );
    } finally {
      setIsLoadingMoreArchive(false);
    }
  }, [isLoadingMoreArchive, archiveHasMore, archiveItems]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setHasSearched(false);
    setSearchResults([]);
    setSearchHasMore(false);
    cachedSearch = { query: "", results: [], hasMore: false };
    if (window.location.pathname !== "/browse" || window.location.search) {
      window.history.replaceState(
        { ...window.history.state, view: "browse", query: "" },
        "",
        "/browse",
      );
    }
    if (!cachedArchive.loaded || cachedArchive.items.length === 0) {
      void loadInitialArchive();
    }
  }, [loadInitialArchive]);

  // Run search if an initial query was passed (from URL or back nav) and not cached
  useEffect(() => {
    if (initialQuery && initialQuery.trim() && !isCachedSearch) {
      setSearchQuery(initialQuery);
      executeSearch(initialQuery);
    }
    return () => {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
    };
  }, [initialQuery, isCachedSearch, executeSearch]);

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
          {searchQuery ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-meta text-(--ink-soft) hover:text-(--ink)"
              aria-label="Clear search text"
            >
              ✕
            </button>
          ) : null}
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

      {/* Top Charts Trending Chips (visible when not searching) */}
      {!hasSearched && topSearches.length > 0 ? (
        <section
          aria-label="Trending searches"
          className="mb-10 max-w-2xl mx-auto"
        >
          <p className="chart-label text-overline mb-4 flex items-center justify-center gap-1.5">
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

      {/* Unified Toolbar with exactly one ReaderFontToggle (crucial invariant for typography test) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 text-center sm:text-left">
        <div>
          {hasSearched && searchResults.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="result-count m-0 text-xl font-bold">
                {searchResults.length}{" "}
                {searchResults.length === 1 ? "confession" : "confessions"} for{" "}
                <span className="font-bold underline decoration-2">
                  {searchQuery}
                </span>
              </p>
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-meta text-(--ink-soft) hover:text-(--ink) underline font-bold"
                aria-label="Clear search and view all crate stories"
              >
                Clear search
              </button>
            </div>
          ) : hasSearched ? (
            <h2 className="text-2xl sm:text-3xl font-script font-bold">
              Search Results
            </h2>
          ) : (
            <div>
              <h2 className="text-3xl sm:text-4xl font-script font-bold mb-1">
                The Crate Archive
              </h2>
              <p className="text-body-sm text-(--ink-soft)">
                Browse all whispered letters in chronological order.
              </p>
            </div>
          )}
        </div>
        <div className="w-full sm:w-auto flex flex-col items-center sm:items-end">
          <ReaderFontToggle variant="list" />
        </div>
      </div>

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
              className="btn btn-paper px-6 py-3 text-button uppercase font-bold tracking-wider"
            >
              Try Again
            </button>
          </div>
        ) : hasSearched && searchResults.length > 0 ? (
          <>
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

            {searchHasMore ? (
              <div className="col-span-full flex flex-col items-center justify-center mt-10 mb-4 px-4">
                {searchLoadMoreError ? (
                  <div role="alert" className="text-center mb-3">
                    <p className="text-body-sm text-(--coral) font-bold mb-2">
                      {searchLoadMoreError}
                    </p>
                    <button
                      type="button"
                      onClick={loadMoreSearch}
                      className="btn btn-paper px-6 py-2.5 text-button font-bold"
                    >
                      Retry unpacking
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={loadMoreSearch}
                    disabled={isLoadingMoreSearch}
                    className="btn btn-paper px-8 py-3.5 text-button font-bold flex items-center gap-3 transition-transform active:scale-95 shadow-[3px_3px_0_var(--ink)] hover:shadow-[1px_1px_0_var(--ink)] hover:translate-x-[2px] hover:translate-y-[2px]"
                    aria-label={`Load more confessions for ${searchQuery}`}
                  >
                    <Vinyl
                      size="22px"
                      className={isLoadingMoreSearch ? "is-spinning" : ""}
                    />
                    <span>
                      {isLoadingMoreSearch
                        ? "Flipping through records…"
                        : `Dig deeper into ${searchQuery}'s crate`}
                    </span>
                  </button>
                )}
                <span className="text-meta text-(--ink-soft) mt-3">
                  Showing {searchResults.length} stories for {searchQuery}
                </span>
              </div>
            ) : (
              <div className="col-span-full text-center mt-12 mb-4 px-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-(--ink-soft)/40 bg-(--bg-wash) text-meta text-(--ink-soft) font-mono">
                  <span>●</span>
                  <span>
                    End of stories for {searchQuery} • {searchResults.length}{" "}
                    found
                  </span>
                </div>
              </div>
            )}
          </>
        ) : hasSearched ? (
          <div className="state-panel col-span-full py-16 muted-on-dark">
            <Vinyl size="100px" />
            <p className="text-lg font-medium mb-2">
              No songs sent to that name yet.
            </p>
            <p className="text-sm mb-6">
              No confessions found for &quot;{searchQuery}&quot;. Someone might
              still be writing it.
            </p>
            <button
              type="button"
              onClick={handleClearSearch}
              className="btn btn-paper px-6 py-3 text-button font-bold"
            >
              Browse all crate confessions
            </button>
          </div>
        ) : isArchiveLoading && archiveItems.length === 0 ? (
          <div role="status" className="col-span-full py-8 w-full">
            <p className="muted-on-dark font-bold mb-6">
              Unpacking the crate archive...
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
        ) : archiveError ? (
          <div role="alert" className="col-span-full py-16">
            <p className="error-on-dark font-medium mb-4">{archiveError}</p>
            <button
              type="button"
              onClick={() => loadInitialArchive()}
              className="btn btn-paper px-6 py-3 text-button uppercase font-bold tracking-wider"
            >
              Try Again
            </button>
          </div>
        ) : archiveItems.length > 0 ? (
          <>
            <div className="pinboard">
              {archiveItems.map((c) => (
                <ConfessionCard
                  key={c.id}
                  data={c}
                  onClick={() =>
                    onSelectConfession(c, {
                      fromView: "browse",
                      fromQuery: "",
                    })
                  }
                />
              ))}
            </div>

            {archiveHasMore ? (
              <div className="col-span-full flex flex-col items-center justify-center mt-10 mb-4 px-4">
                {archiveLoadMoreError ? (
                  <div role="alert" className="text-center mb-3">
                    <p className="text-body-sm text-(--coral) font-bold mb-2">
                      {archiveLoadMoreError}
                    </p>
                    <button
                      type="button"
                      onClick={loadMoreArchive}
                      className="btn btn-paper px-6 py-2.5 text-button font-bold"
                    >
                      Retry unpacking
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={loadMoreArchive}
                    disabled={isLoadingMoreArchive}
                    className="btn btn-paper px-8 py-3.5 text-button font-bold flex items-center gap-3 transition-transform active:scale-95 shadow-[3px_3px_0_var(--ink)] hover:shadow-[1px_1px_0_var(--ink)] hover:translate-x-[2px] hover:translate-y-[2px]"
                    aria-label="Load more older confessions from the archive"
                  >
                    <Vinyl
                      size="22px"
                      className={isLoadingMoreArchive ? "is-spinning" : ""}
                    />
                    <span>
                      {isLoadingMoreArchive
                        ? "Flipping through records…"
                        : "Dig deeper into the archive"}
                    </span>
                  </button>
                )}
                <span className="text-meta text-(--ink-soft) mt-3">
                  Showing {archiveItems.length} stories • Older records waiting below
                </span>
              </div>
            ) : (
              <div className="col-span-full text-center mt-12 mb-4 px-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-(--ink-soft)/40 bg-(--bg-wash) text-meta text-(--ink-soft) font-mono">
                  <span>●</span>
                  <span>
                    End of the archive • {archiveItems.length} stories discovered
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="state-panel col-span-full py-16 muted-on-dark">
            <Vinyl size="100px" />
            <p className="text-lg font-medium mb-2">The crate is empty.</p>
            <p className="text-sm">Be the first to send a confession.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseView;

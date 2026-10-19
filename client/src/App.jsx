import Doodle from "./components/ui/Doodle";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Navbar from "./components/layout/Navbar";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import HomeView from "./views/HomeView";
import { useConfessions, fetchConfessionById } from "./hooks";
import DeleteKeyReceipt from "./components/ui/DeleteKeyReceipt";
import Toast from "./components/ui/Toast";
import MixtapeScrubber from "./components/ui/MixtapeScrubber";
import Logo from "./components/ui/Logo";
import DesignArchive from "./components/ui/DesignArchive";
import NewConfessionsNotice from "./components/ui/NewConfessionsNotice";
import { useSeo } from "./seo/useSeo";
import { routeViews } from "./route-views";
import { parseCurrentLocation } from "./utils/routing";

export default function App({ initialViews = {} }) {
  const BrowseView = initialViews["browse"] || routeViews["browse"];
  const SubmitView = initialViews["submit"] || routeViews["submit"];
  const AboutView = initialViews["about"] || routeViews["about"];
  const DetailsView = initialViews["details"] || routeViews["details"];
  const FaqView = initialViews["faq"] || routeViews["faq"];
  const PrivacyView = initialViews["privacy"] || routeViews["privacy"];
  const DsscLandingView =
    initialViews["dssc-landing"] || routeViews["dssc-landing"];
  const HowToSendGuide =
    initialViews["guide-how-to-send"] || routeViews["guide-how-to-send"];
  const HowToChooseSongGuide =
    initialViews["guide-choose-song"] || routeViews["guide-choose-song"];
  const IsItSafeGuide =
    initialViews["guide-is-it-safe"] || routeViews["guide-is-it-safe"];
  const BotAdminView = initialViews["bot-admin"] || routeViews["bot-admin"];
  const initialRouteRef = useRef(parseCurrentLocation());
  const [view, setView] = useState(initialRouteRef.current.view);
  const [selectedConfession, setSelectedConfession] = useState(null);
  const [isConfessionLoading, setIsConfessionLoading] = useState(false);
  const [confessionError, setConfessionError] = useState(null);
  const [fromView, setFromView] = useState("home");
  const [browseQuery, setBrowseQuery] = useState(initialRouteRef.current.query);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deleteReceipt, setDeleteReceipt] = useState(null);
  const [notice, setNotice] = useState("");
  const closeNotice = useCallback(() => setNotice(""), []);

  useSeo({
    view,
    query: browseQuery,
    confessionId:
      selectedConfession?.id || initialRouteRef.current.confessionId || null,
  });

  const {
    feed,
    isFeedLoading,
    feedError,
    fetchFeed,
    submitConfession,
    searchConfessions,
    hasNewPosts,
    dismissNewPosts,
  } = useConfessions({ enabled: view === "home" });

  const loadConfessionDetails = useCallback(async (id, signal) => {
    setIsConfessionLoading(true);
    setConfessionError(null);
    try {
      const confession = await fetchConfessionById(id, signal);
      if (!confession) {
        setConfessionError("Confession not found. It may have been removed.");
        setSelectedConfession(null);
      } else {
        setSelectedConfession(confession);
      }
    } catch {
      setConfessionError(
        "Unable to load confession. Please check your connection.",
      );
      setSelectedConfession(null);
    } finally {
      setIsConfessionLoading(false);
    }
  }, []);

  // Sync initial state and handle deep links on initial page load
  useEffect(() => {
    const init = initialRouteRef.current;
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    if (init.view === "details" && init.confessionId) {
      loadConfessionDetails(init.confessionId);
    }

    // Set initial history state if empty
    if (!window.history.state) {
      const targetUrl =
        init.view === "home"
          ? "/"
          : init.view === "browse"
            ? init.query
              ? `/browse?to=${encodeURIComponent(init.query)}`
              : "/browse"
            : init.view === "submit"
              ? "/confess"
              : init.view === "about"
                ? "/about"
                : init.view === "faq"
                  ? "/faq"
                  : init.view === "privacy"
                    ? "/privacy"
                    : init.view === "guide-how-to-send"
                      ? "/guides/how-to-send-an-anonymous-song-confession"
                      : init.view === "guide-choose-song"
                        ? "/guides/how-to-choose-a-song-for-your-confession"
                        : init.view === "guide-is-it-safe"
                          ? "/guides/is-it-safe-to-send-an-anonymous-confession"
                          : window.location.pathname + window.location.search;
      window.history.replaceState(
        { view: init.view, query: init.query, fromView: "home", scrollY: 0 },
        "",
        targetUrl,
      );
    }
    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, [loadConfessionDetails]);

  // Handle browser back and forward button events
  useEffect(() => {
    const onPopState = (event) => {
      const route = parseCurrentLocation();
      const state = event.state;

      if (route.view === "details") {
        const origin = state?.fromView || fromView || "home";
        setFromView(origin);
        if (state?.confession) {
          setSelectedConfession(state.confession);
          setConfessionError(null);
          setView("details");
        } else if (route.confessionId) {
          setView("details");
          loadConfessionDetails(route.confessionId);
        }
      } else {
        setView(route.view);
        setSelectedConfession(null);
        setConfessionError(null);
        if (route.view === "browse") {
          setBrowseQuery(route.query || state?.query || "");
        }

        // Restore exact scroll position if returning to previous view
        if (typeof state?.scrollY === "number") {
          requestAnimationFrame(() => {
            window.scrollTo({ top: state.scrollY, behavior: "instant" });
          });
        }
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [fromView, loadConfessionDetails]);

  // Centralized navigation handler
  const handleNavigate = useCallback(
    (targetView, options = {}) => {
      setIsMenuOpen(false);
      // Back/Forward restores the entry being revisited, so save the position
      // on the page we are leaving before pushing the destination entry.
      window.history.replaceState(
        { ...window.history.state, scrollY: window.scrollY },
        "",
        window.location.href,
      );

      if (targetView === "details") {
        const confession = options.confession;
        if (!confession) return;

        const currentScrollY = window.scrollY;
        const origin = options.fromView || view || "home";
        const originQuery = options.fromQuery || browseQuery || "";
        setFromView(origin);

        const targetUrl = `/confession/${confession.id}`;
        window.history.pushState(
          {
            view: "details",
            confession,
            fromView: origin,
            fromQuery: originQuery,
            scrollY: currentScrollY,
          },
          "",
          targetUrl,
        );

        setSelectedConfession(confession);
        setConfessionError(null);
        setView("details");
        window.scrollTo({ top: 0, behavior: "instant" });
        return;
      }

      // Navigating to standard tabs (home, browse, submit, about, faq, privacy, guides)
      let targetUrl = "/";
      if (targetView === "browse") {
        targetUrl = options.query
          ? `/browse?to=${encodeURIComponent(options.query)}`
          : "/browse";
        setBrowseQuery(options.query || "");
      } else if (targetView === "submit") {
        targetUrl = "/confess";
      } else if (targetView === "about") {
        targetUrl = "/about";
      } else if (targetView === "dssc-landing") {
        targetUrl = "/dssc-confessions";
      } else if (targetView === "faq") {
        targetUrl = "/faq";
      } else if (targetView === "privacy") {
        targetUrl = "/privacy";
      } else if (targetView === "guide-how-to-send") {
        targetUrl = "/guides/how-to-send-an-anonymous-song-confession";
      } else if (targetView === "guide-choose-song") {
        targetUrl = "/guides/how-to-choose-a-song-for-your-confession";
      } else if (targetView === "guide-is-it-safe") {
        targetUrl = "/guides/is-it-safe-to-send-an-anonymous-confession";
      }

      const state = { view: targetView, query: options.query || "" };
      if (options.replace) {
        window.history.replaceState(state, "", targetUrl);
      } else {
        window.history.pushState(state, "", targetUrl);
      }

      setView(targetView);
      setSelectedConfession(null);
      setConfessionError(null);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [view, browseQuery],
  );

  // In-app Back button handler for DetailsView
  const handleBack = useCallback(() => {
    // If the browser history has a previous entry from our app, use history.back()
    if (window.history.length > 1 && window.history.state?.fromView) {
      window.history.back();
    } else {
      // Fallback: return cleanly to origin view
      handleNavigate(fromView || "home", {
        query: fromView === "browse" ? browseQuery : undefined,
        replace: true,
      });
    }
  }, [fromView, browseQuery, handleNavigate]);

  // Adapter for components calling onSelectConfession(confession, options)
  const handleSelectConfession = useCallback(
    (confessionOrView, maybeOptions = {}) => {
      if (
        confessionOrView &&
        typeof confessionOrView === "object" &&
        confessionOrView.id
      ) {
        handleNavigate("details", {
          confession: confessionOrView,
          fromView: maybeOptions.fromView || view || "home",
          fromQuery: maybeOptions.fromQuery || browseQuery || "",
        });
        return;
      }
      handleNavigate(confessionOrView, maybeOptions);
    },
    [handleNavigate, view, browseQuery],
  );

  return (
    <div className="site-shell min-h-screen flex flex-col font-sans selection:bg-[var(--ink)] selection:text-[var(--sleeve)] overflow-x-hidden">
      {view !== "details" && (
        <Navbar
          view={view}
          setView={handleNavigate}
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
        />
      )}

      {/* Main content area */}
      <main className={`flex-1 ${view === "details" ? "" : "pt-28 pb-20"}`}>
        <ErrorBoundary key={view}>
          <Suspense
            fallback={
              <p role="status" className="px-6 py-12 text-center">
                Loading page…
              </p>
            }
          >
            {view === "bot-admin" && <BotAdminView />}
            {view === "home" && (
              <HomeView
                feed={feed}
                isFeedLoading={isFeedLoading}
                feedError={feedError}
                onRetry={fetchFeed}
                onSelectConfession={handleSelectConfession}
                setView={handleNavigate}
              />
            )}
            {view === "browse" && (
              <BrowseView
                onSelectConfession={handleSelectConfession}
                searchConfessions={searchConfessions}
                initialQuery={browseQuery}
              />
            )}
            {view === "submit" && (
              <SubmitView
                submitConfession={submitConfession}
                fetchFeed={fetchFeed}
                setView={handleNavigate}
                onPosted={setDeleteReceipt}
              />
            )}
            {view === "about" && <AboutView />}
            {view === "dssc-landing" && (
              <DsscLandingView setView={handleNavigate} />
            )}
            {view === "faq" && <FaqView setView={handleNavigate} />}
            {view === "privacy" && <PrivacyView setView={handleNavigate} />}
            {view === "guide-how-to-send" && (
              <HowToSendGuide setView={handleNavigate} />
            )}
            {view === "guide-choose-song" && (
              <HowToChooseSongGuide setView={handleNavigate} />
            )}
            {view === "guide-is-it-safe" && (
              <IsItSafeGuide setView={handleNavigate} />
            )}
            {view === "details" && (
              <DetailsView
                key={selectedConfession?.id || "loading"}
                selectedConfession={selectedConfession}
                onBack={handleBack}
                fromView={fromView}
                isLoading={isConfessionLoading}
                error={confessionError}
                onDeleted={() => {
                  fetchFeed();
                  handleNavigate("home", { replace: true });
                  setNotice("Confession deleted.");
                }}
              />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="site-footer pt-12 pb-28 px-6 border-t-2 border-[var(--ink)] bg-[var(--bg-wash)] text-[var(--ink-soft)] text-xs font-sans">
        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
          {/* Brand Col */}
          <div className="md:col-span-1">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate("home");
              }}
              aria-label="dssconfessions home"
              className="site-logo block mb-3 no-underline"
            >
              <Logo variant="footer" />
            </a>
            <p className="text-[11px] leading-relaxed text-[var(--ink-soft)] normal-case">
              Some things are easier to say with a song.
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-bold text-[var(--ink)] uppercase tracking-wider text-[11px] mb-3">
              Explore
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate("home");
                  }}
                  className="hover:underline hover:text-[var(--ink)]"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/browse"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate("browse");
                  }}
                  className="hover:underline hover:text-[var(--ink)]"
                >
                  Browse Confessions
                </a>
              </li>
              <li>
                <a
                  href="/confess"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate("submit");
                  }}
                  className="hover:underline hover:text-[var(--ink)]"
                >
                  Post a Confession
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate("about");
                  }}
                  className="hover:underline hover:text-[var(--ink)]"
                >
                  About the Project
                </a>
              </li>
              <li>
                <a
                  href="/dssc-confessions"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate("dssc-landing");
                  }}
                  className="hover:underline hover:text-[var(--ink)] font-bold text-[var(--ink)]"
                >
                  DSSC Confessions
                </a>
              </li>
            </ul>
          </div>

          {/* Help & Privacy */}
          <div>
            <h4 className="font-bold text-[var(--ink)] uppercase tracking-wider text-[11px] mb-3">
              Help &amp; Privacy
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/faq"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate("faq");
                  }}
                  className="hover:underline hover:text-[var(--ink)]"
                >
                  FAQ &amp; How It Works
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate("privacy");
                  }}
                  className="hover:underline hover:text-[var(--ink)]"
                >
                  Privacy Policy &amp; Zero-IP
                </a>
              </li>
            </ul>
          </div>

          {/* Guides */}
          <div>
            <h4 className="font-bold text-[var(--ink)] uppercase tracking-wider text-[11px] mb-3">
              Guides
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/guides/how-to-send-an-anonymous-song-confession"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate("guide-how-to-send");
                  }}
                  className="hover:underline hover:text-[var(--ink)]"
                >
                  How to Send a Confession
                </a>
              </li>
              <li>
                <a
                  href="/guides/how-to-choose-a-song-for-your-confession"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate("guide-choose-song");
                  }}
                  className="hover:underline hover:text-[var(--ink)]"
                >
                  How to Choose a Song
                </a>
              </li>
              <li>
                <a
                  href="/guides/is-it-safe-to-send-an-anonymous-confession"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate("guide-is-it-safe");
                  }}
                  className="hover:underline hover:text-[var(--ink)]"
                >
                  Is It Safe?
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Design Archive Section */}
        <div className="max-w-5xl mx-auto w-full mb-6">
          <DesignArchive />
        </div>

        {/* Doodles & Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-[var(--ink)]/15 max-w-5xl mx-auto w-full gap-4">
          <div className="footer-doodles flex items-center gap-4">
            <Doodle />
            <Doodle kind="note" />
            <Doodle kind="heart" />
          </div>
          <div className="tracking-widest uppercase text-[11px]">
            DSSC CONFESSIONS © 2026 • BUILT WITH PRIVACY FIRST
          </div>
        </div>
        <div className="max-w-5xl mx-auto w-full text-center text-[11px] font-sans text-[var(--ink-soft)] mt-4">
          Independent student project, not affiliated with or endorsed by Davao
          del Sur State College.
        </div>
      </footer>
      {deleteReceipt && (
        <DeleteKeyReceipt
          deleteKey={deleteReceipt}
          onSaved={() => {
            setDeleteReceipt(null);
            handleNavigate("home");
          }}
        />
      )}
      <MixtapeScrubber isMenuOpen={isMenuOpen} />
      {view === "home" && hasNewPosts && !isMenuOpen && !deleteReceipt && (
        <NewConfessionsNotice onRefresh={fetchFeed} onLater={dismissNewPosts} />
      )}
      <Toast message={notice} show={Boolean(notice)} onClose={closeNotice} />
    </div>
  );
}

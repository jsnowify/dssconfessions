import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import { ConfessionCard } from "./components/ui/ConfessionCard";

// --- DYNAMIC API CONFIGURATION ---
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// --- UTILS: Theme & Vibe Logic ---
const getVibe = (id) => {
  if (!id) return { bg: "from-zinc-100", hex: "#f4f4f5" };
  const vibes = [
    { bg: "from-rose-100", hex: "#ffe4e6" },
    { bg: "from-blue-100", hex: "#dbeafe" },
    { bg: "from-amber-100", hex: "#fef3c7" },
    { bg: "from-violet-100", hex: "#ede9fe" },
    { bg: "from-teal-100", hex: "#ccfbf1" },
  ];
  const trackId = id?.split("/track/")[1]?.split("?")[0] || id;
  const index =
    trackId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    vibes.length;
  return vibes[index];
};

// --- SECURITY: Error Boundary ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-10 text-center animate-fade-in">
          <div className="bg-white border-2 border-black p-8 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-bold mb-4 uppercase">System Glitch</h2>
            <button
              onClick={() => window.location.reload()}
              className="bg-black text-white px-6 py-2 rounded-full font-bold uppercase tracking-widest text-xs"
            >
              Refresh App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- UI ICONS ---
const WriteIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);
const SearchIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" x2="16.65" y1="21" y2="16.65"></line>
  </svg>
);
const ListenIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
  </svg>
);
const MenuIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);
const MusicIcon = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>
);

const StepCard = ({ number, title, description, icon }) => (
  <div className="bg-white border-2 border-black p-8 rounded-xl flex flex-col items-center text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-full transition-transform hover:-translate-y-1">
    <div className="w-12 h-12 mb-4 flex items-center justify-center bg-zinc-100 rounded-full border-2 border-black">
      {icon}
    </div>
    <h3 className="font-bold text-xl mb-3 uppercase tracking-tight">
      {number}. {title}
    </h3>
    <p className="text-sm font-medium text-zinc-600 leading-relaxed">
      {description}
    </p>
  </div>
);

export default function App() {
  const [view, setView] = useState(
    () => localStorage.getItem("dssc_view") || "home",
  );
  const [formData, setFormData] = useState(
    () =>
      JSON.parse(localStorage.getItem("dssc_form")) || {
        to: "",
        from: "",
        content: "",
      },
  );
  const [selectedConfession, setSelectedConfession] = useState(
    () => JSON.parse(localStorage.getItem("dssc_selected")) || null,
  );
  const [feed, setFeed] = useState([]);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [songSearch, setSongSearch] = useState("");
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useFallbackImage, setUseFallbackImage] = useState(false); // New State for Fallback

  const shareRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("dssc_view", view);
    localStorage.setItem("dssc_form", JSON.stringify(formData));
    localStorage.setItem("dssc_selected", JSON.stringify(selectedConfession));
  }, [view, formData, selectedConfession]);

  const fetchFeed = useCallback(async () => {
    setIsFeedLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/confessions`);
      setFeed(res.data);
    } catch (e) {
      console.error("Feed Error", e);
    } finally {
      setIsFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    if (songSearch.length < 3) return setSongs([]);
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/search-song?q=${encodeURIComponent(songSearch)}`,
        );
        setSongs(res.data);
      } catch (e) {
        console.error("Spotify Error", e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [songSearch]);

  const executeSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/confessions?to=${encodeURIComponent(searchQuery)}`,
      );
      setSearchResults(res.data);
    } catch (e) {
      console.error("Search Error", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!shareRef.current) return;

    // Attempt standard generation first. If it fails, switch to fallback and retry.
    try {
      const canvas = await html2canvas(shareRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `dssc-confession-${selectedConfession.id || Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.warn("CORS blocked image. Switching to fallback UI.");
      setUseFallbackImage(true); // Trigger re-render with fallback
      // Small delay to allow re-render before capturing again
      setTimeout(async () => {
        try {
          const canvasFallback = await html2canvas(shareRef.current, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
          });
          const link = document.createElement("a");
          link.download = `dssc-confession-${selectedConfession.id || Date.now()}.png`;
          link.href = canvasFallback.toDataURL("image/png");
          link.click();
          setUseFallbackImage(false); // Reset
        } catch (e) {
          alert("Even fallback failed. Browser is very strict!");
        }
      }, 500);
    }
  };

  const handleSubmit = async () => {
    if (!formData.to || !formData.content)
      return alert("Fill required fields!");
    if (!selectedSong) return alert("Select a song vibe first! 🎶");
    try {
      await axios.post(`${API_BASE_URL}/api/confess`, {
        ...formData,
        song: selectedSong,
      });
      setFormData({ to: "", from: "", content: "" });
      setSelectedSong(null);
      setSongSearch("");
      setView("home");
      fetchFeed();
    } catch (e) {
      alert("Failed to post.");
    }
  };

  const isScrollable = useMemo(() => feed.length > 4, [feed]);
  const displayFeed = useMemo(
    () => (isScrollable ? [...feed, ...feed] : feed),
    [feed, isScrollable],
  );

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white overflow-x-hidden">
      {/* NAVBAR */}
      {view !== "details" && (
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
                  {v === "submit" ? "Confess" : v}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2"
            >
              <MenuIcon />
            </button>
          </div>
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
                  {v === "submit" ? "Confess" : v}
                </button>
              ))}
            </div>
          )}
        </nav>
      )}

      <main className={view === "details" ? "" : "pt-32 pb-20"}>
        <ErrorBoundary key={view}>
          {view === "home" && (
            <div className="animate-fade-in text-center px-4">
              <h1 className="text-6xl md:text-9xl font-script mb-4">
                say it loud.
              </h1>
              <p className="text-zinc-400 mb-20 font-medium">
                Untold words, sent through the song.
              </p>
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-6 mb-24">
                <StepCard
                  number="1"
                  title="Write it"
                  description="Compose an anonymous message with a song."
                  icon={<WriteIcon />}
                />
                <StepCard
                  number="2"
                  title="Search it"
                  description="Use the Browse page to find messages for you."
                  icon={<SearchIcon />}
                />
                <StepCard
                  number="3"
                  title="Listen it"
                  description="Play the music and read the full story."
                  icon={<ListenIcon />}
                />
              </div>
              <div className="border-t-2 border-black bg-zinc-50 py-16 overflow-hidden min-h-[400px]">
                <div className="mb-8 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isFeedLoading ? "bg-zinc-300" : "bg-rose-400"} opacity-75`}
                      ></span>
                      <span
                        className={`relative inline-flex rounded-full h-3 w-3 ${isFeedLoading ? "bg-zinc-400" : "bg-rose-500"}`}
                      ></span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {isFeedLoading ? "Synchronizing Vibes..." : "Live Feed"}
                    </span>
                  </div>
                </div>
                {isFeedLoading ? (
                  <div className="flex justify-center gap-8 px-10">
                    <div className="w-[300px] h-[400px] bg-zinc-200 border-2 border-black rounded-2xl animate-pulse shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]"></div>
                  </div>
                ) : (
                  <div
                    className={
                      isScrollable
                        ? "animate-scroll flex w-max"
                        : "flex justify-center flex-wrap gap-8"
                    }
                  >
                    {displayFeed.map((c, i) => (
                      <ConfessionCard
                        key={i}
                        data={c}
                        onClick={() => {
                          setSelectedConfession(c);
                          setView("details");
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "browse" && (
            <div className="max-w-6xl mx-auto px-6 text-center">
              <h2 className="text-5xl font-script mb-10 font-bold">Browse</h2>
              <div className="flex flex-col md:flex-row gap-4 mb-20 max-w-2xl mx-auto">
                <input
                  className="flex-1 border-2 border-black p-4 rounded-xl font-bold"
                  placeholder="Recipient name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && executeSearch()}
                />
                <button
                  onClick={executeSearch}
                  className="bg-black text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs"
                >
                  Search
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
                {isLoading ? (
                  <div className="col-span-full py-20 text-zinc-400 font-bold animate-pulse">
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((c) => (
                    <ConfessionCard
                      key={c.id}
                      data={c}
                      onClick={() => {
                        setSelectedConfession(c);
                        setView("details");
                      }}
                    />
                  ))
                ) : (
                  searchQuery && (
                    <div className="col-span-full py-20 text-zinc-400 italic">
                      No results for "{searchQuery}".
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {view === "submit" && (
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h2 className="text-6xl font-script mb-8">Confess</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      className="border-2 border-black p-4 rounded-xl font-bold"
                      placeholder="To:"
                      value={formData.to}
                      onChange={(e) =>
                        setFormData({ ...formData, to: e.target.value })
                      }
                    />
                    <input
                      className="border-2 border-black p-4 rounded-xl font-bold"
                      placeholder="From (Optional):"
                      value={formData.from}
                      onChange={(e) =>
                        setFormData({ ...formData, from: e.target.value })
                      }
                    />
                  </div>
                  <textarea
                    className="w-full border-2 border-black p-4 rounded-xl h-48 font-medium outline-none resize-none"
                    placeholder="Your words..."
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                  />
                  <div className="relative">
                    <input
                      className="w-full border-2 border-black p-4 rounded-xl font-bold"
                      placeholder={
                        selectedSong
                          ? `Selected: ${selectedSong.name}`
                          : "Search for a song (Required)..."
                      }
                      value={songSearch}
                      onChange={(e) => {
                        setSongSearch(e.target.value);
                        setSelectedSong(null);
                      }}
                    />
                    {songs.length > 0 && !selectedSong && (
                      <div className="absolute bottom-full left-0 w-full bg-white border-2 border-black rounded-xl mb-2 max-h-48 overflow-y-auto z-20 shadow-xl">
                        {songs.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedSong(s);
                              setSongs([]);
                              setSongSearch(s.name);
                            }}
                            className="p-3 hover:bg-black hover:text-white cursor-pointer flex gap-3 items-center border-b border-black text-xs font-bold"
                          >
                            <img
                              src={s.album.images[0].url}
                              className="w-10 h-10 rounded"
                            />{" "}
                            {s.name} - {s.artists[0].name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSubmit}
                    className="w-full bg-black text-white py-5 rounded-xl font-bold text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-800 transition-all"
                  >
                    Post Confession
                  </button>
                </div>
                <div className="flex flex-col items-center p-6 md:p-10 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-300 mt-10 lg:mt-0 overflow-hidden">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-8">
                    Live Preview
                  </span>
                  <div className="w-full scale-90 sm:scale-100 flex justify-center">
                    <ConfessionCard
                      isPreview={true}
                      data={{
                        recipient_to: formData.to,
                        sender_from: formData.from,
                        content: formData.content,
                        song_name: selectedSong?.name,
                        album_art: selectedSong?.album?.images[0]?.url,
                        artist_name: selectedSong?.artists[0]?.name,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === "about" && (
            <div className="max-w-3xl mx-auto px-6 animate-fade-in space-y-12 pb-20">
              <h2 className="text-6xl font-script text-center mb-12 font-bold">
                About
              </h2>
              <section className="bg-white border-2 border-black p-8 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-2xl font-bold uppercase mb-4 tracking-tighter">
                  The Creator
                </h3>
                <p className="text-zinc-600 leading-relaxed italic">
                  Hi, I'm <span className="text-black font-bold">Snowi Wu</span>
                  , a 4th-year BSIT student. I built this for DSSC to practice
                  full-stack architecture and secure cloud data handling.
                </p>
              </section>
              <section className="bg-zinc-50 border-2 border-black p-8 rounded-2xl">
                <h3 className="text-2xl font-bold uppercase mb-4 italic tracking-tighter text-black/40">
                  Inspiration
                </h3>
                <p className="text-zinc-600 leading-relaxed">
                  Inspired by{" "}
                  <span className="text-black font-bold underline">
                    SendTheSong
                  </span>
                  , localized for the DSSC community.
                </p>
              </section>
              <section className="bg-white border-2 border-black p-8 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-2xl font-bold uppercase mb-4 text-rose-600 tracking-tighter">
                  Privacy Guarantee
                </h3>
                <p className="text-zinc-600 leading-relaxed">
                  I believe in true anonymity. No personal data is tracked or
                  sold. Everything is text and song metadata.
                </p>
              </section>
            </div>
          )}

          {view === "details" && selectedConfession && (
            <div className="min-h-screen bg-white flex flex-col items-center px-4 relative pb-20 pt-10">
              {/* === THE GHOST CARD (INVISIBLE) === */}
              <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
                <div
                  ref={shareRef}
                  className={`relative p-12 w-[600px] h-[900px] border-[6px] border-black rounded-[40px] bg-gradient-to-b ${getVibe(selectedConfession.spotify_url).bg} to-white flex flex-col items-center text-center justify-between`}
                >
                  <div>
                    <div className="text-xl font-black uppercase tracking-widest opacity-30 mb-8">
                      dssconfessions.vercel.app
                    </div>
                    <h1 className="text-6xl font-script mb-8">
                      Hello, {selectedConfession.recipient_to}
                    </h1>
                    <div className="w-[400px] h-[400px] bg-white rounded-3xl overflow-hidden border-[6px] border-black mx-auto mb-10 shadow-2xl flex flex-col items-center justify-center p-6 text-black">
                      {useFallbackImage ? (
                        <>
                          <MusicIcon />
                          <div className="mt-6 text-2xl font-bold line-clamp-2">
                            {selectedConfession.song_name}
                          </div>
                          <div className="text-xl font-medium text-zinc-500 mt-2">
                            {selectedConfession.artist_name}
                          </div>
                        </>
                      ) : (
                        <img
                          src={selectedConfession.album_art}
                          className="w-full h-full object-cover"
                          alt="album"
                          crossOrigin="anonymous"
                          onError={() => setUseFallbackImage(true)} // If load fails, trigger fallback
                        />
                      )}
                    </div>
                    <p className="text-4xl font-script italic leading-tight px-4 text-balance">
                      "{selectedConfession.content}"
                    </p>
                  </div>
                  <div className="bg-black text-white px-8 py-3 rounded-full font-mono text-xl font-bold uppercase tracking-widest">
                    From: {selectedConfession.sender_from}
                  </div>
                </div>
              </div>

              {/* === REAL UI === */}
              <div
                className={`absolute top-0 w-full h-[50vh] bg-gradient-to-b ${getVibe(selectedConfession.spotify_url).bg} to-white pointer-events-none`}
              />
              <div className="w-full max-w-4xl flex justify-between items-center mb-8 z-10">
                <button
                  onClick={() => setView("browse")}
                  className="px-6 py-2 bg-white border-2 border-black rounded-full text-[10px] font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handleDownloadImage}
                  className="px-6 py-2 bg-rose-500 text-white border-2 border-black rounded-full text-[10px] font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-2"
                >
                  📸 Save for IG
                </button>
              </div>
              <h1 className="text-5xl md:text-7xl font-script mb-10 z-10 text-center px-4">
                Hello, {selectedConfession.recipient_to}
              </h1>
              <div className="w-full max-w-[450px] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-2xl border-2 border-black overflow-hidden bg-black z-10 mb-10">
                <iframe
                  src={`https://open.spotify.com/embed/track/${selectedConfession.spotify_url?.split("/track/")[1]?.split("?")[0]}?utm_source=generator&theme=0`}
                  width="100%"
                  height="380"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
              <p className="text-3xl md:text-4xl font-script italic z-10 text-center max-w-xl px-4 text-balance animate-fade-in">
                "{selectedConfession.content}"
              </p>
              <p className="mt-10 text-[10px] font-mono font-bold uppercase z-10 text-center">
                SENT VIA DSSCONFESSIONS • FROM: {selectedConfession.sender_from}
              </p>
            </div>
          )}
        </ErrorBoundary>
      </main>

      <footer className="text-center py-12 border-t-2 border-black font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
        DSSCONFESSIONS © 2026
      </footer>
    </div>
  );
}

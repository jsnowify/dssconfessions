import { useState, useCallback, useEffect } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") || "",
  timeout: 35000,
});

// --- HOOK: Fetch & manage confession feed ---
export const useConfessions = () => {
  const [feed, setFeed] = useState([]);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);
  const [refreshSequence, setRefreshSequence] = useState(0);

  const fetchFeed = useCallback(() => {
    setIsFeedLoading(true);
    setFeedError(null);
    setRefreshSequence((sequence) => sequence + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api.get("/api/confessions", { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(res.data)) throw new Error("Invalid feed response");
        setFeed(res.data);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error("Feed Error", error);
        setFeedError("Stories couldn't load. Please try again shortly.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsFeedLoading(false);
      });
    return () => controller.abort();
  }, [refreshSequence]);

  const submitConfession = async (formData, selectedSong) => {
    if (!selectedSong?.id) {
      throw new Error("No song selected.");
    }
    // Only the song ID is sent — the server re-verifies the real track
    // details itself rather than trusting whatever the client sends.
    const res = await api.post("/api/confess", {
      to: formData.to,
      from: formData.from,
      content: formData.content,
      song: { id: selectedSong.id },
    });
    if (res.data?.status !== "success") throw new Error("Invalid submission response");
  };

  const searchConfessions = async (query) => {
    if (!query || !query.trim()) return [];
    const res = await api.get("/api/confessions", {
      params: { to: query.trim() },
    });
    if (!Array.isArray(res.data)) throw new Error("Invalid search response");
    return res.data;
  };

  return {
    feed,
    isFeedLoading,
    feedError,
    fetchFeed,
    submitConfession,
    searchConfessions,
  };
};

// --- HOOK: Spotify song search ---
export const useSongSearch = () => {
  const [songSearch, setSongSearch] = useState("");
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const MIN_CHARS = 3;

  useEffect(() => {
    if (songSearch.trim().length < MIN_CHARS || selectedSong) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {

      try {
        const res = await api.get("/api/search-song", {
          params: { q: songSearch },
          signal: controller.signal,
        });
        // Filter out any tracks missing the fields the UI relies on,
        // instead of letting a malformed result crash the render.
        if (!Array.isArray(res.data)) throw new Error("Invalid song response");
        const safeResults = res.data.filter(
          (s) => s?.id && s?.name && s?.artists?.[0]?.name,
        );
        setSongs(safeResults);
        setHasSearched(true);
      } catch (e) {
        if (axios.isCancel(e) || e.name === "CanceledError") return;
        console.error("Spotify Error", e);
        setSongs([]);
        setHasSearched(true);
        setSearchError(
          e.code === "ECONNABORTED"
            ? "This is taking longer than usual. Check your connection."
            : "Couldn't load songs right now.",
        );
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [songSearch, retryTrigger, selectedSong]);

  const selectSong = (song) => {
    setSelectedSong(song);
    setSongs([]);
    setSongSearch(song.name);
    setHasSearched(false);
    setSearchError(null);
    setIsSearching(false);
  };

  const resetSong = () => {
    setSelectedSong(null);
    setSongs([]);
    setSongSearch("");
    setHasSearched(false);
    setSearchError(null);
    setIsSearching(false);
  };

  const retrySearch = () => {
    setSearchError(null);
    setHasSearched(false);
    setIsSearching(songSearch.trim().length >= MIN_CHARS && !selectedSong);
    // Bumping this number is what actually re-runs the effect above,
    // since songSearch itself hasn't changed on a retry.
    setRetryTrigger((n) => n + 1);
  };

  return {
    songSearch,
    setSongSearch: (val) => {
      setSongSearch(val);
      setSelectedSong(null);
      setSongs([]);
      setSearchError(null);
      setHasSearched(false);
      setIsSearching(val.trim().length >= MIN_CHARS);
    },
    songs,
    selectedSong,
    selectSong,
    resetSong,
    isSearching,
    searchError,
    hasSearched,
    minChars: MIN_CHARS,
    retrySearch,
  };
};

import { useState, useCallback, useEffect, useRef } from "react";
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") || "",
  timeout: 35000,
});

// --- HOOK: Fetch & manage confession feed ---
export const fetchTopSearches = async (signal) => {
  try {
    const { data } = await api.get("/api/top-searches", {
      params: { limit: 8 },
      signal,
    });
    if (!Array.isArray(data)) return [];
    return data
      .filter((item) => typeof item?.term === "string" && item.hits >= 3)
      .slice(0, 8);
  } catch {
    return [];
  }
};

export const useConfessions = ({ enabled = true } = {}) => {
  const [feed, setFeed] = useState([]);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);
  const [refreshSequence, setRefreshSequence] = useState(0);
  const loadedSequence = useRef(null);
  const [pendingPost, setPendingPost] = useState(null);
  const dismissedPost = useRef(null);

  const fetchFeed = useCallback(() => {
    setIsFeedLoading(true);
    setFeedError(null);
    setRefreshSequence((sequence) => sequence + 1);
  }, []);

  useEffect(() => {
    // Retain the feed during navigation; informational pages need no feed read.
    // A successful post/delete invalidates it even while Home is unmounted.
    if (!enabled || loadedSequence.current === refreshSequence) return;
    const controller = new AbortController();
    api
      .get("/api/confessions", { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(res.data)) throw new Error("Invalid feed response");
        setFeed(res.data);
        setPendingPost(null);
        dismissedPost.current = null;
        loadedSequence.current = refreshSequence;
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
  }, [enabled, refreshSequence]);

  useEffect(() => {
    if (
      !enabled ||
      isFeedLoading ||
      feedError ||
      loadedSequence.current === null
    )
      return;
    const controller = new AbortController();
    let checking = false;
    const check = async () => {
      if (checking || document.hidden || navigator.onLine === false) return;
      checking = true;
      try {
        const { data } = await api.get("/api/confessions", {
          params: { latest: "1" },
          signal: controller.signal,
        });
        const newest = data?.[0];
        if (
          controller.signal.aborted ||
          !newest?.id ||
          newest.id === dismissedPost.current ||
          feed.some((post) => post.id === newest.id)
        )
          return;
        if (
          !feed.length ||
          Date.parse(newest.created_at) > Date.parse(feed[0].created_at)
        )
          setPendingPost(newest.id);
      } catch {
        /* Updates are optional; keep the current feed usable. */
      } finally {
        checking = false;
      }
    };
    const timer = setInterval(check, 60000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      controller.abort();
      document.removeEventListener("visibilitychange", check);
    };
  }, [enabled, isFeedLoading, feedError, feed]);

  const dismissNewPosts = useCallback(() => {
    dismissedPost.current = pendingPost;
    setPendingPost(null);
  }, [pendingPost]);

  const submitConfession = useCallback(async (formData, selectedSong) => {
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
      allowReplies: formData.allowReplies ?? true,
    });
    if (res.data?.status !== "success")
      throw new Error("Invalid submission response");
    if (typeof res.data.deleteKey !== "string")
      throw new Error(
        "Delete key was not returned. Please contact the site owner before retrying.",
      );
    return res.data;
  }, []);

  const searchConfessions = useCallback(async (query, signal) => {
    if (!query || !query.trim()) return [];
    const res = await api.get("/api/confessions", {
      params: { to: query.trim() },
      signal,
    });
    if (!Array.isArray(res.data)) throw new Error("Invalid search response");
    return res.data;
  }, []);

  return {
    feed,
    isFeedLoading,
    feedError,
    fetchFeed,
    submitConfession,
    searchConfessions,
    hasNewPosts: Boolean(pendingPost),
    dismissNewPosts,
  };
};

export const fetchConfessionById = async (id, signal) => {
  if (!id || typeof id !== "string") return null;
  const res = await api.get("/api/confessions", {
    params: { id: id.trim() },
    signal,
  });
  if (Array.isArray(res.data) && res.data.length > 0) {
    return res.data[0];
  }
  return null;
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

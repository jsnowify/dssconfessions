import { useState, useCallback, useEffect, useRef } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL && import.meta.env.PROD) {
  // Fail loudly in production instead of silently calling localhost
  // on the visitor's own machine.
  console.error("VITE_API_BASE_URL is not set. API requests will fail.");
}

const BASE_URL = API_BASE_URL || "http://localhost:5000";

// --- HOOK: Fetch & manage confession feed ---
export const useConfessions = () => {
  const [feed, setFeed] = useState([]);
  const [isFeedLoading, setIsFeedLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    setIsFeedLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/confessions`);
      setFeed(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Feed Error", e);
    } finally {
      setIsFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const submitConfession = async (formData, selectedSong) => {
    if (!selectedSong?.id) {
      throw new Error("No song selected.");
    }
    // Only the song ID is sent — the server re-verifies the real track
    // details itself rather than trusting whatever the client sends.
    await axios.post(`${BASE_URL}/api/confess`, {
      to: formData.to,
      from: formData.from,
      content: formData.content,
      song: { id: selectedSong.id },
    });
  };

  const searchConfessions = async (query) => {
    if (!query || !query.trim()) return [];
    const res = await axios.get(`${BASE_URL}/api/confessions`, {
      params: { to: query.trim() },
    });
    return Array.isArray(res.data) ? res.data : [];
  };

  return {
    feed,
    isFeedLoading,
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
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (songSearch.trim().length < 3) {
      setSongs([]);
      return;
    }

    const timer = setTimeout(async () => {
      // Cancel any in-flight request so a slow older response can't
      // overwrite results from a newer, faster one.
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await axios.get(`${BASE_URL}/api/search-song`, {
          params: { q: songSearch },
          signal: controller.signal,
        });
        // Filter out any tracks missing the fields the UI relies on,
        // instead of letting a malformed result crash the render.
        const safeResults = (res.data || []).filter(
          (s) => s?.id && s?.name && s?.artists?.[0]?.name,
        );
        setSongs(safeResults);
      } catch (e) {
        if (axios.isCancel(e) || e.name === "CanceledError") return;
        console.error("Spotify Error", e);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [songSearch]);

  const selectSong = (song) => {
    setSelectedSong(song);
    setSongs([]);
    setSongSearch(song.name);
  };

  const resetSong = () => {
    setSelectedSong(null);
    setSongs([]);
    setSongSearch("");
  };

  return {
    songSearch,
    setSongSearch: (val) => {
      setSongSearch(val);
      setSelectedSong(null);
    },
    songs,
    selectedSong,
    selectSong,
    resetSong,
  };
};

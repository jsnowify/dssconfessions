import { useState, useCallback, useEffect } from "react";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// --- HOOK: Fetch & manage confession feed ---
export const useConfessions = () => {
  const [feed, setFeed] = useState([]);
  const [isFeedLoading, setIsFeedLoading] = useState(true);

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

  const submitConfession = async (formData, selectedSong) => {
    await axios.post(`${API_BASE_URL}/api/confess`, {
      ...formData,
      song: selectedSong,
    });
  };

  const searchConfessions = async (query) => {
    const res = await axios.get(
      `${API_BASE_URL}/api/confessions?to=${encodeURIComponent(query)}`,
    );
    return res.data;
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

import { useState } from "react";
import { ConfessionCard } from "../components/ui/ConfessionCard";
import { useSongSearch } from "../hooks";

const SubmitView = ({ submitConfession, fetchFeed, setView }) => {
  const [formData, setFormData] = useState({ to: "", from: "", content: "" });
  const {
    songSearch,
    setSongSearch,
    songs,
    selectedSong,
    selectSong,
    resetSong,
  } = useSongSearch();

  const handleSubmit = async () => {
    if (!formData.to || !formData.content)
      return alert("Fill required fields!");
    if (!selectedSong) return alert("Select a song vibe first! 🎶");
    try {
      await submitConfession(formData, selectedSong);
      setFormData({ to: "", from: "", content: "" });
      resetSong();
      setView("home");
      fetchFeed();
    } catch (e) {
      alert("Failed to post.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h2 className="text-6xl font-script mb-8">Confess</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="border-2 border-black p-4 rounded-xl font-bold"
              placeholder="To:"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
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
              onChange={(e) => setSongSearch(e.target.value)}
            />
            {songs.length > 0 && !selectedSong && (
              <div className="absolute bottom-full left-0 w-full bg-white border-2 border-black rounded-xl mb-2 max-h-48 overflow-y-auto z-20 shadow-xl">
                {songs.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => selectSong(s)}
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
  );
};

export default SubmitView;

import { useState } from "react";
import { ConfessionCard } from "../components/ui/ConfessionCard";

const BrowseView = ({ onSelectConfession, searchConfessions }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const executeSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const results = await searchConfessions(searchQuery);
      setSearchResults(results);
      setHasSearched(true);
    } catch (e) {
      console.error("Search Error", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 text-center">
      <h2 className="text-5xl font-script mb-8 font-bold">Browse</h2>
      <div className="flex flex-col md:flex-row gap-4 mb-12 max-w-2xl mx-auto">
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
          <div className="col-span-full py-16 text-zinc-400 font-bold animate-pulse">
            Searching...
          </div>
        ) : hasSearched && searchResults.length > 0 ? (
          searchResults.map((c) => (
            <ConfessionCard
              key={c.id}
              data={c}
              onClick={() => onSelectConfession(c)}
            />
          ))
        ) : hasSearched ? (
          <div className="col-span-full py-16 text-zinc-400 italic">
            No results for "{searchQuery}".
          </div>
        ) : (
          // Idle state before any search — filling this with a real
          // prompt instead of rendering nothing is what was causing the
          // page to look broken/empty on load.
          <div className="col-span-full py-16 flex flex-col items-center gap-2 text-zinc-400">
            <span className="text-3xl">🔍</span>
            <p className="font-medium">
              Type a name above to browse confessions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseView;

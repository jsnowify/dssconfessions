import { useState } from "react";
import { ConfessionCard } from "../components/ui/ConfessionCard";

const BrowseView = ({ onSelectConfession, searchConfessions }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const executeSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const results = await searchConfessions(searchQuery);
      setSearchResults(results);
    } catch (e) {
      console.error("Search Error", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
              onClick={() => onSelectConfession(c)}
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
  );
};

export default BrowseView;

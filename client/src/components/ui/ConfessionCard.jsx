import React from "react";

export const ConfessionCard = React.memo(
  ({ data, onClick, isPreview = false }) => {
    // Helper to handle date formatting safely during preview
    const formatDate = (dateString) => {
      if (!dateString) return new Date().toLocaleDateString();
      const date = new Date(dateString);
      return isNaN(date.getTime())
        ? new Date().toLocaleDateString()
        : date.toLocaleDateString();
    };

    return (
      <div
        onClick={onClick}
        className={`w-80 flex-shrink-0 bg-white border-2 border-black p-6 rounded-xl relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${
          !isPreview
            ? "cursor-pointer hover:shadow-none hover:translate-y-1 mx-4"
            : "mx-auto"
        }`}
      >
        {/* Date / Status Tag */}
        <div className="absolute top-4 right-4 text-[10px] font-mono text-zinc-400">
          {isPreview ? "PREVIEW" : formatDate(data.created_at)}
        </div>

        {/* Recipient Tag */}
        <div className="mb-4">
          <span className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            To: {data.recipient_to || "......"}
          </span>
        </div>

        {/* Content Section */}
        <p className="text-2xl font-script leading-snug mb-6 line-clamp-3 h-24 whitespace-pre-line text-black">
          "{data.content || "Your untold words..."}"
        </p>

        {/* Footer: Song & Sender */}
        <div className="flex items-center justify-between border-t-2 border-zinc-100 pt-4">
          <div className="flex items-center gap-3">
            {(data.song_name || data.album_art) && (
              <>
                <img
                  src={data.album_art}
                  className="w-8 h-8 rounded-full border border-black object-cover"
                  alt=""
                />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold truncate max-w-[100px] leading-tight text-black">
                    {data.song_name}
                  </span>
                  <span className="text-[9px] text-zinc-400 truncate max-w-[100px]">
                    {data.artist_name}
                  </span>
                </div>
              </>
            )}
          </div>
          <p className="text-[10px] font-bold uppercase text-black">
            From: {data.sender_from || "Anon"}
          </p>
        </div>
      </div>
    );
  },
);

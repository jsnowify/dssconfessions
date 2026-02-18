// --- UTILS: Theme & Vibe Logic ---
export const getVibe = (id) => {
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

export const vibeHexMap = {
  "from-rose-100": "#ffe4e6",
  "from-blue-100": "#dbeafe",
  "from-amber-100": "#fef3c7",
  "from-violet-100": "#ede9fe",
  "from-teal-100": "#ccfbf1",
  "from-zinc-100": "#f4f4f5",
};

export const getVibe = (id) => {
  if (!id) return { bg: "from-zinc-100", shadow: "rgba(0,0,0,1)" };
  const vibes = [
    { bg: "from-rose-100", shadow: "rgba(225,29,72,0.2)" },
    { bg: "from-blue-100", shadow: "rgba(37,99,235,0.2)" },
    { bg: "from-amber-100", shadow: "rgba(217,119,6,0.2)" },
    { bg: "from-violet-100", shadow: "rgba(124,58,237,0.2)" },
    { bg: "from-teal-100", shadow: "rgba(13,148,136,0.2)" },
  ];
  const index =
    id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    vibes.length;
  return vibes[index];
};

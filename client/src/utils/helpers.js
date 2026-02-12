export const getVibe = (id) => {
  if (!id) return { bg: "from-zinc-100" };
  const vibes = [
    "from-rose-100",
    "from-blue-100",
    "from-amber-100",
    "from-violet-100",
    "from-teal-100",
  ];
  const index =
    id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    vibes.length;
  return { bg: vibes[index] };
};

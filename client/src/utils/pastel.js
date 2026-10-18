export const pastels = ["sky", "mint", "lilac", "peach", "butter", "pink"];

// Presentation only: the same persisted id always receives the same tile color.
export function cardPastel(id) {
  if (!id) return "var(--sky)";
  let hash = 0;
  for (const letter of String(id))
    hash = (hash * 31 + letter.codePointAt(0)) >>> 0;
  return `var(--${pastels[hash % pastels.length]})`;
}

// --- UTILS: Feed Layout Logic ---
export const computeFeedLayout = (feed) => {
  if (feed.length >= 7) {
    const mid = Math.ceil(feed.length / 2);
    const row1 = feed.slice(0, mid);
    const row2 = feed.slice(mid);
    return {
      mode: "double",
      row1: [...row1, ...row1, ...row1, ...row1],
      row2: [...row2, ...row2, ...row2, ...row2],
    };
  } else {
    const isScrollable = feed.length > 4;
    return {
      mode: "single",
      items: isScrollable ? [...feed, ...feed] : feed,
      isScrollable,
    };
  }
};

// --- HELPER: Canvas Rounded Rect ---
export const roundRect = (ctx, x, y, w, h, r) => {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  return ctx;
};

// --- HELPER: Smart Text Wrapper & Sizer ---
export const drawSmartText = (ctx, text, x, centerY, maxWidth, maxHeight) => {
  let fontSize = 60;
  const minFontSize = 24;
  let lines = [];
  let lineHeight = 0;

  do {
    ctx.font = `italic ${fontSize}px Georgia, serif`;
    lineHeight = fontSize * 1.4;
    lines = [];
    const words = text.split(" ");
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);

    const totalHeight = lines.length * lineHeight;
    if (totalHeight <= maxHeight) break;
    fontSize -= 2;
  } while (fontSize > minFontSize);

  const totalBlockHeight = lines.length * lineHeight;
  let currentY = centerY - totalBlockHeight / 2 + lineHeight / 3;

  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  lines.forEach((line) => {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  });
};

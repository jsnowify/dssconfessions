import { cardPastel } from "./pastel";
import { roundRect } from "./canvas";
import { recipientLabel } from "./confession-labels";

const graphemes = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null;
const characters = (text) => graphemes
  ? Array.from(graphemes.segment(text), (part) => part.segment)
  : Array.from(text);

function fit(ctx, text, width) {
  const value = String(text || "");
  if (ctx.measureText(value).width <= width) return value;
  const parts = characters(value);
  while (parts.length && ctx.measureText(parts.join("") + "…").width > width)
    parts.pop();
  return parts.join("") + "…";
}

function wrap(ctx, text, width) {
  const lines = [];
  for (const paragraph of String(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (ctx.measureText((line ? line + " " : "") + word).width <= width) {
        line += (line ? " " : "") + word;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const letter of characters(word)) {
        if (ctx.measureText(line + letter).width > width && line) {
          lines.push(line);
          line = "";
        }
        line += letter;
      }
    }
    lines.push(line);
  }
  return lines;
}

async function artwork(url) {
  if (!url || !/^https:\/\//.test(url)) return null;
  return new Promise((resolve) => {
    const image = new Image();
    const finish = (value) => {
      clearTimeout(timer);
      image.onload = image.onerror = null;
      resolve(value);
    };
    const timer = setTimeout(() => {
      finish(null);
      image.src = "";
    }, 4000);
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        // A failed CDN response must never taint the PNG canvas.
        const probe = document.createElement("canvas");
        probe.width = probe.height = 1;
        const ctx = probe.getContext("2d");
        ctx.drawImage(image, 0, 0, 1, 1);
        ctx.getImageData(0, 0, 1, 1);
        finish(image);
      } catch {
        finish(null);
      }
    };
    image.onerror = () => finish(null);
    image.src = url;
  });
}

// Export at a fixed 360-unit layout and 3x resolution. Resolve the existing type
// tokens at that width so a tablet and a phone produce the same composition.
function typography(style) {
  const probe = document.createElement("span");
  probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none";
  document.body.append(probe);
  const length = (token) => {
    probe.style.fontSize = style.getPropertyValue(token).trim()
      .replace(/([\d.]+)vw/g, (_, value) => `${Number(value) * 3.6}px`);
    return parseFloat(getComputedStyle(probe).fontSize);
  };
  try {
    return {
      brand: length("--fs-h2"),
      heading: length("--fs-h3"),
      body: length("--fs-body"),
      small: length("--fs-body-sm"),
      meta: length("--fs-meta"),
      message: length("--fs-message"),
    };
  } finally {
    probe.remove();
  }
}

export async function createShareCard(data, height = 1350) {
  if (![1350, 1920].includes(height)) throw new Error("Unsupported image size.");
  await document.fonts.ready;
  const style = getComputedStyle(document.documentElement);
  const token = (name) => style.getPropertyValue(name).trim();
  const fonts = {
    script: token("--font-script"),
    message: token("--font-message"),
    ui: token("--font-sans"),
  };
  const sizes = typography(style);
  const weight = token("--fw-bold");
  const normal = token("--fw-normal");
  const sample = `${recipientLabel(data) || ""} ${data.content || ""} ${data.song_name || ""} ${data.artist_name || ""} ${data.sender_from || ""}`;
  const [, image] = await Promise.all([
    Promise.allSettled([
      document.fonts.load(`${weight} ${sizes.brand}px ${fonts.script}`, `DSSConfessions ${sample}`),
      document.fonts.load(`${normal} ${sizes.message}px ${fonts.message}`, sample),
      document.fonts.load(`${weight} ${sizes.body}px ${fonts.ui}`, sample),
      document.fonts.load(`${normal} ${sizes.small}px ${fonts.ui}`, sample),
    ]),
    artwork(data.album_art),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create share image.");
  ctx.scale(3, 3);
  const h = height / 3;
  const color = (name) => token(name);
  const fill = (x, y, w, boxHeight, radius, background, border = false) => {
    ctx.fillStyle = background;
    roundRect(ctx, x, y, w, boxHeight, radius);
    ctx.fill();
    if (border) {
      ctx.strokeStyle = color("--ink");
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };
  const text = (value, x, y, size, family, bold = false, ink = "--ink") => {
    ctx.font = `${bold ? weight : normal} ${size}px ${family}`;
    ctx.fillStyle = color(ink);
    ctx.fillText(value, x, y);
  };
  const vinyl = (x, y, radius) => {
    ctx.fillStyle = color("--ink");
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color("--ink-soft");
    ctx.lineWidth = 1;
    for (const ratio of [0.58, 0.75, 0.9]) {
      ctx.beginPath();
      ctx.arc(x, y, radius * ratio, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = color("--pink");
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color("--ink");
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.09, 0, Math.PI * 2);
    ctx.fill();
  };

  ctx.fillStyle = color("--bg");
  ctx.fillRect(0, 0, 360, h);
  ctx.fillStyle = color("--bg-wash");
  ctx.beginPath();
  ctx.arc(350, 55, 140, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(15, h - 15, 120, 0, Math.PI * 2);
  ctx.fill();

  const top = height === 1920 ? 114 : 88;
  const bottom = h - (height === 1920 ? 96 : 54);
  const songY = bottom - 110;
  vinyl(39, top - 47, 18);
  text("DSSConfessions", 66, top - 43, sizes.brand, fonts.script, true);
  text("Untold words, sent through the song.", 22, top - 17, sizes.meta, fonts.ui, false, "--ink-soft");

  fill(24, top + 4, 316, bottom - top, 18, color("--ink"));
  fill(20, top, 316, bottom - top, 18, color(cardPastel(data.id).slice(4, -1)), true);
  ctx.save();
  ctx.translate(258, top + 2);
  ctx.rotate(-0.1);
  fill(-34, -8, 68, 17, 2, color("--butter"), true);
  ctx.restore();

  text("To", 38, top + 30, sizes.meta, fonts.ui, true);
  ctx.font = `${weight} ${sizes.heading}px ${fonts.script}`;
  const recipientLines = wrap(ctx, recipientLabel(data) || "Someone", 276);
  const contentTop = top + (recipientLines.length > 1 ? 96 : 72);
  text(recipientLines[0], 38, top + 55, sizes.heading, fonts.script, true);
  if (recipientLines.length > 1) {
    const second = recipientLines.slice(1).join(" ");
    text(fit(ctx, second, 276), 38, top + 79, sizes.heading, fonts.script, true);
  }

  ctx.font = `${normal} ${sizes.message}px ${fonts.message}`;
  const lineHeight = sizes.message * Number(token("--lh-message"));
  const lines = wrap(ctx, `“${data.content || "Your untold words…"}”`, 276);
  const maxLines = Math.max(1, Math.floor((songY - 18 - contentTop) / lineHeight));
  const visible = lines.slice(0, maxLines);
  const truncated = lines.length > visible.length;
  if (truncated) visible[visible.length - 1] = fit(ctx, `${visible.at(-1)}…`, 276);
  const messageY = contentTop + Math.max(0, (songY - 18 - contentTop - visible.length * lineHeight) / 2);
  ctx.textBaseline = "top";
  visible.forEach((line, i) => text(line, 38, messageY + i * lineHeight, sizes.message, fonts.message));
  ctx.textBaseline = "alphabetic";

  fill(38, songY, 280, 64, 12, color("--surface"), true);
  if (image) {
    ctx.save();
    roundRect(ctx, 48, songY + 10, 44, 44, 7);
    ctx.clip();
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 48, songY + 10, 44, 44);
    ctx.restore();
  } else vinyl(70, songY + 32, 22);
  ctx.font = `${weight} ${sizes.body}px ${fonts.ui}`;
  text(fit(ctx, data.song_name || "Untitled Track", 202), 104, songY + 27, sizes.body, fonts.ui, true);
  ctx.font = `${normal} ${sizes.small}px ${fonts.ui}`;
  text(fit(ctx, data.artist_name || "Unknown artist", 202), 104, songY + 47, sizes.small, fonts.ui, false, "--ink-soft");
  ctx.font = `${normal} ${sizes.meta}px ${fonts.ui}`;
  text(fit(ctx, `From: ${data.sender_from?.trim() || "Anonymous"}`, 276), 38, bottom - 18, sizes.meta, fonts.ui);

  ctx.textAlign = "center";
  text(truncated ? "Read the full confession on DSSConfessions" : "A little courage. A song. A confession.", 180, bottom + 28, sizes.meta, fonts.ui, false, "--ink-soft");
  text("dssconfessions.vercel.app", 180, bottom + 46, sizes.meta, fonts.ui, true);

  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("Could not create share image.")),
    "image/png",
  ));
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  // Attached anchors and delayed cleanup also support mobile Safari downloads.
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

import { cardPastel } from "./pastel";
import { roundRect } from "./canvas";
import { recipientLabel } from "./confession-labels";

function fit(ctx, text, width) {
  let value = String(text || "");
  if (ctx.measureText(value).width <= width) return value;
  while (value && ctx.measureText(value + "…").width > width)
    value = value.slice(0, -1);
  return value + "…";
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
      for (const letter of word) {
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
  try {
    return await new Promise((resolve) => {
      const image = new Image();
      const timer = setTimeout(() => {
        image.src = "";
        resolve(null);
      }, 4000);
      image.crossOrigin = "anonymous";
      image.onload = () => {
        clearTimeout(timer);
        resolve(image);
      };
      image.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      image.src = url;
    });
  } catch {
    return null;
  }
}
export async function createShareCard(data, height = 1350) {
  await document.fonts.ready;
  const style = getComputedStyle(document.documentElement);
  const hand = style.getPropertyValue("--font-handwritten").trim();
  const script = style.getPropertyValue("--font-script").trim();
  const ui = getComputedStyle(
    document.querySelector(".site-shell") || document.body,
  ).fontFamily;
  await Promise.all([
    document.fonts.load(`64px ${hand}`),
    document.fonts.load(`36px ${ui}`),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const color = (name) => style.getPropertyValue(name).trim();
  const fill = (x, y, w, h, radius, background) => {
    ctx.fillStyle = background;
    roundRect(ctx, x, y, w, h, radius);
    ctx.fill();
  };
  ctx.fillStyle = color("--bg");
  ctx.fillRect(0, 0, 1080, height);
  fill(82, 94, 924, height - 180, 24, color("--ink"));
  fill(70, 80, 924, height - 180, 24, color(cardPastel(data.id).slice(4, -1)));
  ctx.strokeStyle = color("--ink");
  ctx.lineWidth = 5;
  roundRect(ctx, 70, 80, 924, height - 180, 24);
  ctx.stroke();
  fill(126, 138, 770, 90, 12, color("--surface"));
  ctx.fillStyle = color("--ink");
  ctx.font = `bold 34px ${ui}`;
  ctx.fillText(
    fit(ctx, `TO: ${recipientLabel(data) || "Someone"}`, 712),
    150,
    196,
  );
  ctx.font = `72px ${hand}`;
  ctx.fillStyle = color("--ink");
  const lines = wrap(ctx, `“${data.content || ""}”`, 820);
  const maxLines = Math.max(4, Math.floor((height - 730) / 90));
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines)
    visible[visible.length - 1] = fit(ctx, visible.at(-1) + "…", 800);
  visible.forEach((line, i) => ctx.fillText(line, 130, 320 + i * 90));
  const songY = height - 400;
  fill(126, songY, 812, 184, 16, color("--surface"));
  let image = await artwork(data.album_art);
  if (image) {
    try {
      // Probe a separate canvas before risking a tainted export canvas.
      const probe = document.createElement("canvas");
      probe.width = probe.height = 1;
      const pctx = probe.getContext("2d");
      pctx.drawImage(image, 0, 0, 1, 1);
      pctx.getImageData(0, 0, 1, 1);
    } catch {
      image = null;
    }
  }
  if (image) ctx.drawImage(image, 150, songY + 28, 128, 128);
  else {
    ctx.fillStyle = color("--sky");
    ctx.beginPath();
    ctx.arc(214, songY + 92, 64, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color("--ink");
    ctx.lineWidth = 3;
    for (let r = 48; r < 49; r += 7) {
      ctx.beginPath();
      ctx.arc(214, songY + 92, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = color("--pink");
    ctx.beginPath();
    ctx.arc(214, songY + 92, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color("--bg");
    ctx.beginPath();
    ctx.arc(214, songY + 92, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = color("--ink");
  ctx.font = `bold 40px ${ui}`;
  ctx.fillText(fit(ctx, data.song_name, 600), 304, songY + 78);
  ctx.fillStyle = color("--ink-soft");
  ctx.font = `32px ${ui}`;
  ctx.fillText(fit(ctx, data.artist_name, 600), 304, songY + 128);
  const sender = data.sender_from?.trim();
  if (sender && sender.toLowerCase() !== "anonymous") {
    ctx.font = `26px ${ui}`;
    ctx.fillText(fit(ctx, `FROM: ${sender}`, 780), 130, height - 164);
  }
  ctx.fillStyle = color("--text");
  ctx.font = `bold 38px ${script}`;
  ctx.fillText("dssconfessions", 70, height - 32);
  return await new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Could not create share image.")),
      "image/png",
    ),
  );
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

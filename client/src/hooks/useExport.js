import { useState } from "react";
import { getVibe, vibeHexMap } from "../utils/vibes";
import { roundRect, drawSmartText } from "../utils/canvas";

export const useExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadImage = async (selectedConfession) => {
    if (!selectedConfession) return;
    setIsExporting(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 1080;
      canvas.height = 1920;

      const vibe = getVibe(selectedConfession.spotify_url);
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, vibeHexMap[vibe.bg] || "#f4f4f5");
      gradient.addColorStop(1, "#ffffff");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const cardY = 480;
      const cardSize = 500;
      const footerY = 1700;

      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.letterSpacing = "0.3em";
      ctx.fillText("DSSCONFESSIONS.VERCEL.APP", centerX, 120);

      ctx.fillStyle = "#000000";
      ctx.font = "bold 80px Georgia, serif";
      ctx.fillText("Hello, " + selectedConfession.recipient_to, centerX, 300);

      ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
      ctx.shadowBlur = 50;
      ctx.shadowOffsetY = 20;

      const cardX = (canvas.width - cardSize) / 2;
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, cardX, cardY, cardSize, cardSize, 60);
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = "#000000";
      ctx.font = "150px sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText("🎵", centerX, cardY + cardSize / 2 - 50);

      ctx.font = "bold 32px sans-serif";
      const songTitle = selectedConfession.song_name || "Unknown Track";
      if (ctx.measureText(songTitle).width > cardSize - 60)
        ctx.font = "bold 24px sans-serif";
      ctx.fillText(songTitle, centerX, cardY + cardSize - 120);

      ctx.fillStyle = "#666666";
      ctx.font = "24px sans-serif";
      ctx.fillText(
        selectedConfession.artist_name || "Unknown Artist",
        centerX,
        cardY + cardSize - 80,
      );

      const textTop = cardY + cardSize + 60;
      const textBottom = footerY - 60;
      const maxTextHeight = textBottom - textTop;
      const textCenterY = textTop + maxTextHeight / 2;

      const content = '"' + (selectedConfession.content || "") + '"';
      drawSmartText(ctx, content, centerX, textCenterY, 900, maxTextHeight);

      const badgeWidth = 600;
      const badgeHeight = 90;
      const badgeX = (canvas.width - badgeWidth) / 2;

      ctx.fillStyle = "#000000";
      roundRect(ctx, badgeX, footerY, badgeWidth, badgeHeight, 45);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px monospace";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "FROM: " +
          (selectedConfession.sender_from || "ANONYMOUS").toUpperCase(),
        centerX,
        footerY + badgeHeight / 2 + 2,
      );

      const link = document.createElement("a");
      link.download = `dssc-story-${selectedConfession.id || Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Pubmat Error:", err);
      alert("Failed to create image.");
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, handleDownloadImage };
};

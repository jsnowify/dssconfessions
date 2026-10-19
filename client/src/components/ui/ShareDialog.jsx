import { useEffect, useState } from "react";
import Modal from "./Modal";
import Select from "./Select";
import { createShareCard, downloadBlob } from "../../utils/shareCard";

const SIZE_OPTIONS = [
  {
    value: "1350",
    label: "Portrait · 1080 × 1350",
    description: "Standard feed post (4:5)",
  },
  {
    value: "1920",
    label: "Story · 1080 × 1920",
    description: "Full vertical story (9:16)",
  },
];

export default function ShareDialog({ data, onClose, notify }) {
  const [height, setHeight] = useState(1350);
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const say = (message) => {
    setStatus(message);
    notify(message);
  };
  useEffect(() => {
    let active = true;
    let url;
    const generate = async () => {
      try {
        const blob = await createShareCard(data, height);
        url = URL.createObjectURL(blob);
        if (active) {
          setImage({ blob, url, height });
          setError("");
        } else URL.revokeObjectURL(url);
      } catch {
        if (active)
          setError("Image generation failed. Please close and try again.");
      }
    };
    void generate();
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [data, height]);
  const ready = image?.height === height;
  const share = async () => {
    if (!ready) return;
    try {
      const file = new File([image.blob], "dssconfessions.png", {
        type: "image/png",
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        say("Share sheet opened.");
      } else {
        downloadBlob(image.blob, "dssconfessions.png");
        say("Image downloaded. Share the saved PNG.");
      }
    } catch (e) {
      say(
        e.name === "AbortError"
          ? "Sharing cancelled."
          : "Sharing failed. Try Download PNG.",
      );
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/confession/${data.id}`,
      );
      say("Confession link copied.");
    } catch {
      say("Copy failed. Copy the confession link from your address bar.");
    }
  };
  return (
    <Modal title="Share this record" onClose={onClose}>
      <div className="mb-5">
        <Select
          id="share-size"
          label="Image size"
          options={SIZE_OPTIONS}
          value={String(height)}
          onChange={(val) => setHeight(Number(val))}
        />
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : ready ? (
        <img
          className="share-image"
          src={image.url}
          alt="Confession share card preview"
        />
      ) : (
        <p role="status">Preparing your image…</p>
      )}
      <div className="feature-actions mt-5">
        <button
          type="button"
          className="btn btn-primary px-4"
          disabled={!ready}
          onClick={share}
        >
          Share
        </button>
        <button
          type="button"
          className="btn btn-paper px-4"
          disabled={!ready}
          onClick={() => {
            downloadBlob(image.blob, `dssconfessions-${height}.png`);
            say("PNG downloaded.");
          }}
        >
          Download PNG
        </button>
        <button type="button" className="btn btn-paper px-4" onClick={copy}>
          Copy link
        </button>
      </div>
      <p role="status" className="mt-3">
        {status}
      </p>
      <p className="mt-4 text-meta">
        Created on your device. We never upload this image.
      </p>
    </Modal>
  );
}

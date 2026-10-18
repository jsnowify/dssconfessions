import { useEffect, useState } from "react";
import Modal from "./Modal";

export default function DeleteKeyReceipt({ deleteKey, onSaved }) {
  const [status, setStatus] = useState("");
  useEffect(() => {
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const close = () => {
    if (window.confirm("Have you saved your delete key? We cannot recover it."))
      onSaved();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(deleteKey);
      setStatus("Delete key copied.");
    } catch {
      setStatus("Copy failed. Select the key and copy it manually.");
    }
  };
  const download = () => {
    const blob = new Blob(
      [
        `dssconfessions delete key\n${deleteKey}\n\nKeep this private. We cannot recover it.\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dssconfessions-delete-key.txt";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Delete key downloaded.");
  };
  return (
    <Modal title="Save your delete key" onClose={close}>
      <p className="mb-4">
        This is the only time we show this. We can&apos;t recover it. Without it
        you can&apos;t delete this confession.
      </p>
      <label className="block font-bold mb-2" htmlFor="saved-delete-key">
        Your private delete key
      </label>
      <input
        id="saved-delete-key"
        className="input w-full p-3 font-mono mb-4"
        value={deleteKey}
        readOnly
        autoComplete="off"
        onFocus={(event) => event.target.select()}
      />
      <div className="feature-actions">
        <button type="button" className="btn btn-paper px-4" onClick={copy}>
          Copy
        </button>
        <button type="button" className="btn btn-paper px-4" onClick={download}>
          Download .txt
        </button>
      </div>
      <p role="status" className="my-4">
        {status}
      </p>
      <button
        type="button"
        className="btn btn-primary w-full py-3"
        onClick={onSaved}
      >
        I saved it
      </button>
    </Modal>
  );
}

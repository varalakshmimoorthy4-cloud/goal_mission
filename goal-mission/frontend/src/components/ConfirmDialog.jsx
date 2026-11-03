import { useState } from "react";
import Modal from "./Modal";

// Used for every destructive action (deleting goals, missions, chat history).
export default function ConfirmDialog({ title, message, confirmLabel = "Delete", onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={onCancel} width={440}>
      <p className="confirm-message">{message}</p>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={handleConfirm} disabled={busy}>
          {busy ? "Working..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

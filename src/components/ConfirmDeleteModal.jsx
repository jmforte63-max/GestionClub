export default function ConfirmDeleteModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="confirm-modal-header">
          <span className="confirm-modal-icon">⚠️</span>
          <h3>{title}</h3>
        </div>

        <p className="confirm-modal-message">{message}</p>

        <div className="confirm-modal-actions">
          <button className="cancel-button" onClick={onCancel}>Cancelar</button>
          <button className="delete-button" onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

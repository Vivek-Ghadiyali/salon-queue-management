export default function ConfirmDialog({ title, description, confirmLabel = 'Confirm', onConfirm, onClose }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
        <span className="eyebrow">PLEASE CONFIRM</span>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-description">{description}</p>
        <div className="dialog-actions"><button type="button" className="button button-outline" onClick={onClose}>Keep my place</button><button type="button" className="button button-gold" onClick={onConfirm}>{confirmLabel}</button></div>
      </section>
    </div>
  );
}

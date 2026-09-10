function ModalHeader({ eyebrow, title, titleId, trailingAction = null }) {
  return (
    <header className="modal-actions">
      <div className="modal-heading">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={titleId}>{title}</h2>
      </div>
      {trailingAction}
    </header>
  );
}

export default ModalHeader;
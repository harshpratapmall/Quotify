function ModalHeader({ eyebrow, title, titleId, leadingActions = null, trailingAction = null }) {
  return (
    <header className={`modal-actions ${leadingActions ? 'modal-actions--stacked' : ''}`}>
      {leadingActions && <div className="modal-leading-actions">{leadingActions}</div>}
      <div className="modal-heading">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={titleId}>{title}</h2>
      </div>
      {trailingAction}
    </header>
  );
}

export default ModalHeader;
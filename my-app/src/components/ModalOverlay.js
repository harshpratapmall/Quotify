import { createPortal } from 'react-dom';

// Shared modal scaffolding: click away on the backdrop closes the modal while
// clicks inside the section are preserved. All per-modal classes and a11y
// attributes are passed through.
function ModalOverlay({ onClose, children, backdropClass = 'modal-backdrop', sectionClass = '', sectionProps = {}, portal = false }) {
  const overlay = (
    <div className={backdropClass} role="presentation" onMouseDown={onClose}>
      <section
        className={sectionClass}
        role="dialog"
        aria-modal="true"
        {...sectionProps}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>
  );

  return portal ? createPortal(overlay, document.body) : overlay;
}

export default ModalOverlay;

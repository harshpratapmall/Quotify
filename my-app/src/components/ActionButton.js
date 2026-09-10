import ActionIcon from './ActionIcon';

function ActionButton({ icon, label, className = '', onClick, disabled }) {
  return (
    <button type="button" className={`action-button ${className}`} onClick={onClick} disabled={disabled} title={label} aria-label={label}>
      <ActionIcon type={icon} />
      <span>{label}</span>
    </button>
  );
}

export default ActionButton;
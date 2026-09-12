import IconButton from './IconButton';

const controlTypes = {
  back: { icon: 'back', className: 'workspace-control-back' },
  plus: { icon: 'plus', className: 'workspace-control-plus' },
  close: { icon: 'close', className: 'workspace-control-close' },
};

// Reusable compact controls for workspace and modal headers. Pages can supply
// one or two of the supported actions: back, plus, and close.
function WorkspaceControls({ actions, className = '' }) {
  return (
    <div className={`workspace-controls ${className}`.trim()}>
      {actions.map(({ type, label, onClick, disabled = false }) => {
        const control = controlTypes[type];
        if (!control) return null;
        return <IconButton key={type} icon={control.icon} className={`workspace-control ${control.className}`} label={label} onClick={onClick} disabled={disabled} />;
      })}
    </div>
  );
}

export default WorkspaceControls;

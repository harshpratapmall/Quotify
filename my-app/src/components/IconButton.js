import ActionIcon from './ActionIcon';

export default function IconButton({ icon, label, className = '', ...props }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} {...props}><ActionIcon type={icon} /></button>;
}

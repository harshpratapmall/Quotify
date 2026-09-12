import ActionIcon from './ActionIcon';

export default function IconButton({ icon, label, className = '', href, ...props }) {
  const sharedClass = `icon-button ${className}`;
  const content = <ActionIcon type={icon} />;
  if (href) {
    return <a className={sharedClass} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} {...props}>{content}</a>;
  }
  return <button type="button" className={sharedClass} aria-label={label} title={label} {...props}>{content}</button>;
}
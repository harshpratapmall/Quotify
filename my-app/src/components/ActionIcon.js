function ActionIcon({ type }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    open: <path d="M4 12s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Zm8 2.5A2.5 2.5 0 1 0 12 9a2.5 2.5 0 0 0 0 5Z" />,
    edit: <path d="m4 16.5-.7 3.2 3.2-.7L17.7 7.8l-2.8-2.8L4 16.5ZM13.5 6.4l2.8 2.8" />,
    delete: <path d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />,
  };

  return (
    <svg
      className="action-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[type]}
    </svg>
  );
}

export default ActionIcon;

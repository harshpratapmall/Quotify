function ActionIcon({ type }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    open: <path d="M4 12s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Zm8 2.5A2.5 2.5 0 1 0 12 9a2.5 2.5 0 0 0 0 5Z" />,
    edit: <path d="m4 16.5-.7 3.2 3.2-.7L17.7 7.8l-2.8-2.8L4 16.5ZM13.5 6.4l2.8 2.8" />,
    delete: <path d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />,
    logout: <path d="M10 5H5v14h5m5-4 4-3-4-3m4 3H9" />,
    profile: <><circle cx="12" cy="8" r="3.25" /><path d="M5.5 20c.7-3.5 3-5.25 6.5-5.25s5.8 1.75 6.5 5.25" /></>,
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

function ActionIcon({ type }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    open: <path d="M4 12s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Zm8 2.5A2.5 2.5 0 1 0 12 9a2.5 2.5 0 0 0 0 5Z" />,
    edit: <path d="m4 16.5-.7 3.2 3.2-.7L17.7 7.8l-2.8-2.8L4 16.5ZM13.5 6.4l2.8 2.8" />,
    delete: <path d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />,
    logout: <path d="M10 5H5v14h5m5-4 4-3-4-3m4 3H9" />,
    profile: <><circle cx="12" cy="8" r="3.25" /><path d="M5.5 20c.7-3.5 3-5.25 6.5-5.25s5.8 1.75 6.5 5.25" /></>,
    quotation: <><path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8.5 12h7M8.5 16h5" /></>,
    bill: <><path d="M6 3h12v18H6z" /><path d="M9 7h6M9 11h6M9 15h2m2 0h2" /></>,
    library: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16.5a1.5 1.5 0 0 1-1.5 1.5H6.5A2.5 2.5 0 0 1 4 18.5v-13Z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 11h6" /></>,
    back: <path d="M19 12H5M12 19l-7-7 7-7" />,
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

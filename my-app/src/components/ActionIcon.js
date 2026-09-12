function ActionIcon({ type }) {
  const paths = {
    close: <path d="m6 6 12 12M6 18 18 6" />,
    archive: <><path d="M4 4h16v4H4zM6 8v12h12V8M10 12h4" /></>,
    restore: <path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" />,
    save: <path d="M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8" />,
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
    link: <path d="m10 13 4-4M8 15l-2 2a3.5 3.5 0 0 1-5-5l5-5a3.5 3.5 0 0 1 5 0m2 2 2-2a3.5 3.5 0 0 1 5 5l-5 5a3.5 3.5 0 0 1-5 0" />,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
    message: <path d="M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-1l-5 2 1-5a9 9 0 1 1 17-5ZM8 8c1 4 3 6 7 7" />,
    power: <><path d="M12 2v10M6 5a9 9 0 1 0 12 0" /></>,
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
    chevron: <path d="m6 9 6 6 6-6" />,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />,
    email: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>,
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

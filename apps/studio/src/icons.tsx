import type { ReactNode, SVGProps } from "react";

type IconName =
  | "arrow"
  | "back"
  | "check"
  | "close"
  | "copy"
  | "help"
  | "info"
  | "plus"
  | "search"
  | "spark"
  | "star"
  | "theme"
  | "up"
  | "lock"
  | "unlock"
  | "reset"
  | "edit"
  | "warning"
  | "folder"
  | "download"
  | "upload"
  | "duplicate"
  | "trash"
  | "undo"
  | "redo";

const paths: Readonly<Record<IconName, ReactNode>> = {
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  back: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <><path d="m6 6 12 12" /><path d="M6 18 18 6" /></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  help: <><path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1Z" /><path d="M12 6v15" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><path d="M12 7v.1" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  spark: <><path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7Z" /><path d="M20 2v4" /><path d="M18 4h4" /></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9Z" />,
  theme: <><circle cx="12" cy="12" r="8" /><path d="M12 4v16" /><path d="M12 4a8 8 0 0 1 0 16" /></>,
  up: <><path d="m6 14 6-6 6 6" /><path d="M12 8v12" /></>,
  lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  unlock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 7-2.6" /></>,
  reset: <><path d="M4 8V4h4" /><path d="M5.5 5.5A8 8 0 1 1 4 14" /></>,
  edit: <><path d="m4 20 4.5-1 10-10a2 2 0 0 0-3-3l-10 10Z" /><path d="m14 7 3 3" /></>,
  warning: <><path d="M12 3 2.7 20h18.6Z" /><path d="M12 9v5" /><path d="M12 17v.1" /></>,
  folder: <><path d="M3 7.5h7l2 2h9v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M3 7.5V5a2 2 0 0 1 2-2h4l2 2h4" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 20h16" /></>,
  upload: <><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M4 20h16" /></>,
  duplicate: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /><path d="M14 11v6M11 14h6" /></>,
  trash: <><path d="M4 7h16" /><path d="m9 3h6l1 4H8Z" /><path d="m6 7 1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></>,
  undo: <><path d="M9 7 4 12l5 5" /><path d="M5 12h8a6 6 0 0 1 6 6" /></>,
  redo: <><path d="m15 7 5 5-5 5" /><path d="M19 12h-8a6 6 0 0 0-6 6" /></>,
};

export interface IconProps extends SVGProps<SVGSVGElement> {
  readonly name: IconName;
}

export function Icon({ name, className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={"studio-icon " + className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

import type { SVGProps } from "react";

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
  | "theme";

const paths: Readonly<Record<IconName, React.ReactNode>> = {
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
  theme: <><circle cx="12" cy="12" r="8" /><path d="M12 4v16" /><path d="M12 4a8 8 0 0 1 0 16" /></>,
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

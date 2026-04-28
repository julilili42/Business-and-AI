/**
 * Minimal inline SVG icons.
 *
 * We don't pull a whole icon library — each icon is hand-trimmed to
 * the few we actually use. All icons inherit `currentColor` so they
 * pick up text color from their parent.
 */
import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function Icon({ size = 16, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const InboxIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 9h3l1 2h4l1-2h3" />
    <path d="M2 9V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5" />
    <path d="M2 9v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9" />
  </Icon>
);

export const PaperclipIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11.5 5L6.7 9.8a1.6 1.6 0 1 0 2.3 2.3L13.5 7.7a3 3 0 1 0-4.2-4.2L4.6 8.2a4.4 4.4 0 1 0 6.2 6.2l4.5-4.5" />
  </Icon>
);

export const SparkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3M3.5 3.5l2 2M10.5 10.5l2 2M3.5 12.5l2-2M10.5 5.5l2-2" />
  </Icon>
);

export const RefreshIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 8a6 6 0 1 1-1.7-4.2" />
    <path d="M14 2v3.5h-3.5" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8.5L6.5 12 13 4.5" />
  </Icon>
);

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 5v3.5" />
    <circle cx="8" cy="11" r="0.5" fill="currentColor" stroke="none" />
    <path d="M7.1 2.5L1.7 12a1 1 0 0 0 .9 1.5h10.8a1 1 0 0 0 .9-1.5L8.9 2.5a1 1 0 0 0-1.8 0Z" />
  </Icon>
);

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 4.5V8l2.5 1.5" />
  </Icon>
);

export const ExternalIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 2h5v5" />
    <path d="M14 2L7.5 8.5" />
    <path d="M12 9v3.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 2 12.5v-7A1.5 1.5 0 0 1 3.5 4H7" />
  </Icon>
);

export const FileIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L9 2Z" />
    <path d="M9 2v4h4" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 4h11" />
    <path d="M5.5 4V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4" />
    <path d="M3.5 4l.7 9a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9l.7-9" />
  </Icon>
);

export const SendIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 2L1.5 7.5l4.5 1.5 1.5 4.5L14 2Z" />
    <path d="M14 2L6 10" />
  </Icon>
);

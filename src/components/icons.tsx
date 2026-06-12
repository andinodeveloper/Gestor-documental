import type { NavKey } from "@/lib/types";

interface IconProps {
  className?: string;
}

export function PasswordVisibilityIcon({
  revealed,
  className,
}: IconProps & {
  revealed: boolean;
}) {
  if (revealed) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3 21 21" />
        <path d="M10.6 10.7a3 3 0 0 0 4.2 4.2" />
        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.4 0 9.4 5.1 10 6-.5.8-2.1 3.2-4.6 4.8" />
        <path d="M6.7 6.8C4.3 8.4 2.8 10.7 2 11.9c.6.9 4.6 6.1 10 6.1a10.5 10.5 0 0 0 3-.4" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function NavIcon({
  name,
  className,
}: IconProps & {
  name: NavKey;
}) {
  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />
        </svg>
      );
    case "requests":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 4h10l3 3v13H4V4h3z" />
          <path d="M8 10h8M8 14h8M8 18h5" />
        </svg>
      );
    case "documents":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 3h8l4 4v14H6z" />
          <path d="M14 3v5h5M8 13h8M8 17h6" />
        </svg>
      );
    case "reviews":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m4 12 4 4 12-12" />
          <path d="M4 6h7M4 18h7" />
        </svg>
      );
    case "explorer":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M3 6V5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v1" />
        </svg>
      );
    case "ai":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3v4M5.6 6.6l2.8 2.8M3 12h4M5.6 17.4l2.8-2.8M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
          <path d="M18.4 6.6 15.6 9.4M21 12h-4M18.4 17.4 15.6 14.6" />
        </svg>
      );
    case "admin":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3 4 7v5c0 5 3.5 8.6 8 9 4.5-.4 8-4 8-9V7z" />
          <path d="M9.5 12 11 13.5 14.5 10" />
        </svg>
      );
  }
}

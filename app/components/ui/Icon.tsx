import React from "react";

export type IconName =
  | "Home"
  | "Settings2"
  | "SettingsCog"
  | "UserPlus"
  | "Sparkle"
  | "Braces"
  | "FileText"
  | "Database"
  | "Play"
  | "ExternalLink"
  | "BookOpen"
  | "User"
  | "Link"
  | "Circle"
  | "Box"
  | "Search"
  | "Download"
  | "Check"
  | "Cancel"
  | "Article"
  | "Video"
  | "Mic"
  | "GitBranch"
  | "Globe"
  | "Terminal"
  | "Trophy"
  | "Briefcase"
  | "Server"
  | "Upload"
  | "Unlink"
  | "NeuralNetwork"
  | "CircuitBoard";

// SVG path data extracted from pixelarticons v2.1.0
const iconPaths: Record<IconName, string[]> = {
  Home: [
    "M4 20h16v2H4zm16-10h2v10h-2zM2 10h2v10H2zm2-2h2v2H4zm2-2h2v2H6zm2-2h2v2H8zm2-2h4v2h-4zm4 2h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2zM8 14h2v6H8zm2-2h4v2h-4zm4 2h2v6h-2z",
  ],
  Settings2: [
    "M4 14h2v6H4zm6 0h2v6h-2zm-4-2h4v2H6zm0 8h4v2H6zm-4-4h2v2H2zm20-8h-4V6h4z",
    "M10 16h12v2H10zm4-8H2V6h12zm6-4v2h-2V4zm0 6V8h-2v2zm-6-8h4v2h-4zm0 10h4v-2h-4zm-2-8h2v2h-2zm0 6h2V8h-2z",
  ],
  SettingsCog: [
    "M9 0h6v2H9zm6 24H9v-2h6zM0 15V9h2v6zm24-6v6h-2V9zM9 2h2v4H9zm6 20h-2v-4h2zM2 15v-2h4v2zm20-6v2h-4V9zm-9-7h2v4h-2zm-2 20H9v-4h2zM2 11V9h4v2zm20 2v2h-4v-2zM7 4h2v2H7zm10 0h-2v2h2zm0 16h-2v-2h2zM7 20h2v-2H7zM2 2h5v2H2zm20 0h-5v2h5zm0 20h-5v-2h5zM2 22h5v-2H2z",
    "M2 2h2v5H2zm20 0h-2v5h2zm0 20h-2v-5h2zM2 22h2v-5H2zM4 7h2v2H4zm16 0h-2v2h2zm0 10h-2v-2h2zM4 17h2v-2H4zm6-9h4v2h-4zm0 6h4v2h-4zm-2-4h2v4H8zm6 0h2v4h-2z",
  ],
  UserPlus: [
    "M9 2h6v2H9zm0 8h6v2H9zm6-6h2v6h-2zM7 4h2v6H7zM4 18h2v4H4zm14 0h2v4h-2zM8 14h8v2H8zm-2 2h2v2H6z",
    "M18 16h2v6h-2z",
    "M16 18h6v2h-6z",
  ],
  Sparkle: [
    "M11 1h2v4h-2zm0 22h2v-4h-2zM9 5h2v4H9zm0 14h2v-4H9zm4-14h2v4h-2zm0 14h2v-4h-2zM5 9h4v2H5zm14 0h-4v2h4zM1 11h4v2H1zm22 0h-4v2h4zM5 13h4v2H5zm14 0h-4v2h4z",
  ],
  Braces: [
    "M6 4h4v2H6zm12 0h-4v2h4zM6 20h4v-2H6zm12 0h-4v-2h4zM4 6h2v5H4zm16 0h-2v5h2zM4 18h2v-5H4zm16 0h-2v-5h2zM2 11h2v2H2zm20 0h-2v2h2z",
  ],
  FileText: [
    "M6 4H4v16h2zm10-2H6v2h10zm4 4h-2v14h2zm-2 14H6v2h12zM16 4h2v2h-2zm-4 0h2v6h-2z",
    "M12 8h6v2h-6zm-4 8h8v2H8zm0-4h8v2H8zm0-4h2v2H8z",
  ],
  Database: [
    "M2 6h2v4H2zm0 4h2v4H2zm0 4h2v4H2zm18-8h2v4h-2zm0 4h2v4h-2zm0 4h2v4h-2zM4 4h4v2H4zm0 8h4v-2H4zm0 4h4v-2H4zm0 4h4v-2H4zM16 4h4v2h-4zm0 8h4v-2h-4zm0 4h4v-2h-4zm0 4h4v-2h-4zM8 2h8v2H8zm0 12h8v-2H8zm0 4h8v-2H8zm0 4h8v-2H8z",
  ],
  Play: [
    "M15 11h-2V9h2zm0 4h-2v-2h2zm-2 2h-2v-2h2zm0-8h-2V7h2zm-2-2H9V5h2zM9 21H7V3h2zm6-8h2v-2h-2zm-6 4h2v2H9z",
  ],
  ExternalLink: [
    "M11 5H5v2h6V5ZM5 7H3v12h2V7Zm12 12H5v2h12v-2Zm2-6h-2v6h2v-6Zm-8 0H9v2h2v-2Zm2-2h-2v2h2v-2Zm2-2h-2v2h2V9Zm2-2h-2v2h2V7Zm2-2h-2v2h2V5Zm2-2h-2v8h2V3Z",
    "M21 3h-8v2h8V3Z",
  ],
  BookOpen: [
    "M2 3h9v2H2zM0 19h11v2H0zM13 3h9v2h-9zm0 16h11v2H13zM11 5h2v18h-2zM0 5h2v14H0zm22 0h2v14h-2zm-7 2h5v2h-5zm0 4h5v2h-5zm0 4h2v2h-2z",
  ],
  User: [
    "M9 2h6v2H9zm0 8h6v2H9zm6-6h2v6h-2zM7 4h2v6H7zM4 18h2v4H4zm14 0h2v4h-2zM8 14h8v2H8zm-2 2h2v2H6zm10 0h2v2h-2z",
  ],
  Link: [
    "M4 6h7v2H4zm0 10h7v2H4zM2 8h2v8H2zm18-2h-7v2h7zm0 10h-7v2h7zm2-8h-2v8h2zM7 11h10v2H7z",
  ],
  Circle: [
    "M6 2h12v2H6zm0 18h12v2H6zM2 6h2v12H2zm18 0h2v12h-2zm-2-2h2v2h-2zm0 14h2v2h-2zM4 4h2v2H4zm0 14h2v2H4z",
  ],
  Box: [
    "M14 4h4v2h-4zm-4-2h4v2h-4zM6 8h4v2H6zm0 10h4v2H6zm4-8h4v2h-4zm0 10h4v2h-4zm4-12h4v2h-4zm0 10h4v2h-4zM6 4h4v2H6zM2 6h4v2H2zm0 10h4v2H2zM18 6h4v2h-4zm0 10h4v2h-4z",
    "M2 6h2v12H2zm18 0h2v12h-2zm-8 6h2v8h-2z",
  ],
  Search: [
    "M22 22h-2v-2h2v2Zm-2-2h-2v-2h2v2Zm-6-2H6v-2h8v2Zm4 0h-2v-2h2v2ZM6 16H4v-2h2v2Zm10 0h-2v-2h2v2ZM4 14H2V6h2v8Zm14 0h-2V6h2v8ZM6 6H4V4h2v2Zm10 0h-2V4h2v2Zm-2-2H6V2h8v2Z",
  ],
  Download: [
    "M21 15v4h-2v-4zm-2 4v2H5v-2zM5 15v4H3v-4zm8-12v14h-2V3z",
    "M7 11v2h10v-2zm2 2v2h2v-2zm4 0v2h2v-2z",
    "M15 11v2h2v-2z",
  ],
  Check: [
    "M10 18H8v-2h2v2Zm-2-2H6v-2h2v2Zm4-2v2h-2v-2h2Zm-6 0H4v-2h2v2Zm8 0h-2v-2h2v2Zm2-2h-2v-2h2v2Zm2-2h-2V8h2v2Zm2-2h-2V6h2v2Z",
  ],
  Cancel: [
    "M6 2h12v2H6zm0 18h12v2H6zM2 6h2v12H2zm18 0h2v12h-2zm-2-2h2v2h-2zm-2 2h2v2h-2zm-2 2h2v2h-2zm-2 2h2v2h-2zm-2 2h2v2h-2zm-2 2h2v2H8zm-2 2h2v2H6zm12 2h2v2h-2zM4 4h2v2H4zm0 14h2v2H4z",
  ],
  Article: [
    "M8 2h12v2H8zM6 4h2v16H6zm14 0h2v16h-2zM4 20h16v2H4zm-2-9h2v9H2zm2-2h2v2H4zm6-3h8v2h-8zm0 4h8v2h-8zm0-2h2v2h-2zm6 0h2v2h-2zm-6 5h8v2h-8zm0 3h4v2h-4z",
  ],
  Video: [
    "M20 17V7h2v10zm-2-2V9h2v6zM2 7h2v10H2zm14 0h2v10h-2zM4 5h12v2H4zm0 12h12v2H4z",
  ],
  Mic: [
    "M10 2h4v2h-4zM8 4h2v10H8zm2 10h4v2h-4zm4-10h2v10h-2zM4 10h2v6H4zm2 6h2v2H6zm2 2h8v2H8zm8-2h2v2h-2zm2-6h2v6h-2zm-7 10h2v2h-2z",
  ],
  GitBranch: [
    "M4 14h4v2H4zm0 6h4v2H4zm-2-4h2v4H2zm6 0h2v4H8zm8-14h4v2h-4zm0 6h4v2h-4zm-2-4h2v4h-2zm6 0h2v4h-2zm-8 13h5v2h-5zm5-5h2v5h-2zM5 2h2v10H5z",
  ],
  Globe: [
    "M6 2h12v2H6zm0 18h12v2H6zM4 4h2v2H4zm5 0h2v2H9zm0 14h2v2H9zm4 0h2v2h-2zM7 6h2v12H7zm8 0h2v12h-2zm-2-2h2v2h-2zm7 0h-2v2h2zM2 6h2v12H2zm20 0h-2v12h2zM4 18h2v2H4zm16 0h-2v2h2z",
    "M3 11h18v2H3z",
  ],
  Terminal: [
    "M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2zM6 16h2v2H6zm2-2h2v2H8zm-2-2h2v2H6z",
  ],
  Trophy: [
    "M6 3h12v2H6z",
    "M6 3h2v12H6zm10 0h2v12h-2z",
    "M16 5h6v2h-6zM2 5h6v2H2zm0 2h2v4H2zm2 4h2v2H4zm14 0h2v2h-2zm2-4h2v4h-2zM8 15h8v2H8zm3 2h2v4h-2z",
    "M9 19h6v2H9z",
  ],
  Briefcase: [
    "M2 8h2v12H2zm18 0h2v12h-2zM4 6h16v2H4zm0 14h16v2H4zM8 4h2v2H8zm2-2h4v2h-4zm4 2h2v2h-2z",
  ],
  Server: [
    "M6 7h4v2H6zm0 8h4v2H6zM2 5h2v14H2zm18 0h2v14h-2zM4 19h16v2H4zM4 3h16v2H4zm0 8h16v2H4z",
  ],
  Upload: [
    "M19 21H5v-2h14v2ZM5 19H3v-4h2v4Zm16 0h-2v-4h2v4ZM13 5h2v2h2v2h-4v8h-2V9H7V7h2V5h2V3h2v2Z",
  ],
  Unlink: [
    "M4 6h5v2H4zm11 0h5v2h-5zm0 10h5v2h-5zM4 16h5v2H4zm16-8h2v8h-2zM2 8h2v8H2zm9-4h2v16h-2z",
  ],
  NeuralNetwork: [
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z",
  ],
  CircuitBoard: [
    "M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2zM8 6h2v2H8zm8 12h-2v-2h2zM6 8h2v2H6zm12 8h-2v-2h2zM8 10h2v2H8zm8 4h-2v-2h2zm-6-6h6v2h-6zm4 8H8v-2h6zm2-12h2v4h-2zM8 20H6v-4h2z",
  ],
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  color?: string;
}

export function Icon({
  name,
  size = 16,
  className = "",
  color = "currentColor",
}: IconProps) {
  const paths = iconPaths[name] || iconPaths.Home;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ color }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

// Common icon mappings for easier usage
export const ICONS = {
  // Roles — unique icons
  frontend: "Briefcase",
  backend: "Server",
  fullstack: "Globe",
  shopify: "Sparkle",
  devops: "SettingsCog",

  // Languages — braces { }
  javascript: "Braces",
  typescript: "Braces",
  rust: "Braces",
  sql: "Braces",

  // Frameworks — blocks (composable building units)
  react: "Box",
  remix: "Box",
  "next-js": "Box",

  // Tech — server (infrastructure / runtime services)
  postgresql: "Server",
  redis: "Server",
  docker: "Server",

  // Resource icons
  article: "Article",
  video: "Video",
  course: "BookOpen",
  podcast: "Mic",
  book: "BookOpen",
  opensource: "GitBranch",
  website: "Link",
  official: "Trophy",
  external: "ExternalLink",

  // UI icons
  settings: "SettingsCog",
  gear: "Settings2",
  search: "Search",
  download: "Download",
  home: "Home",
  user: "User",
  skill: "CircuitBoard",

  // Status icons
  done: "Check",
  active: "Play",
  todo: "Circle",
  skipped: "Cancel",
} as const;

import type { SVGProps } from "react";

import type { SystemIconId } from "../stencils/types";

export const SYSTEM_ICON_IDS = [
  "internet",
  "global-routing",
  "edge-pop",
  "load-balancer",
  "service-routing",
  "application-router",
  "data-router",
  "hash-ring",
  "browser",
  "canvas",
  "whiteboard",
  "workspace",
  "local-storage",
  "file-snapshot",
  "template-grid",
  "image",
  "import-export",
  "origin-shield",
  "control-plane",
  "client",
  "application-server",
  "fallback",
  "writer",
  "worker",
  "scheduler",
  "service-registry",
  "request-coalescer",
  "policy-gate",
  "telemetry",
  "key-value-store",
  "cache",
  "database",
  "distributed-database",
  "message-queue",
  "partition",
  "replica-group",
  "leader",
  "process",
  "thread",
  "operating-system",
  "runtime",
  "network-socket",
  "file-system",
  "server",
  "cpu",
  "memory",
  "disk",
  "network-interface",
  "rack",
] as const satisfies readonly SystemIconId[];

const systemIconIds = new Set<string>(SYSTEM_ICON_IDS);

export const isSystemIconId = (value: unknown): value is SystemIconId =>
  typeof value === "string" && systemIconIds.has(value);

export interface SystemIconProps extends SVGProps<SVGSVGElement> {
  iconId: string;
  size?: number;
  title?: string;
}

function IconArtwork({ iconId }: { iconId: string }) {
  switch (iconId) {
    case "internet":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.8 12h16.4M12 3.5c2.3 2.2 3.5 5 3.5 8.5S14.3 18.3 12 20.5M12 3.5c-2.3 2.2-3.5 5-3.5 8.5s1.2 6.3 3.5 8.5" />
        </>
      );
    case "global-routing":
      return (
        <>
          <circle cx="10" cy="12" r="7" />
          <path d="M3.3 12h13.4M10 5c1.8 1.8 2.7 4.1 2.7 7s-.9 5.2-2.7 7M10 5C8.2 6.8 7.3 9.1 7.3 12s.9 5.2 2.7 7M15.5 5.5h5v5M20.5 5.5l-5.1 5.1" />
        </>
      );
    case "edge-pop":
      return (
        <>
          <path d="m12 7 4.3 2.5v5L12 17l-4.3-2.5v-5L12 7Z" />
          <circle cx="4" cy="6" r="1.5" />
          <circle cx="20" cy="6" r="1.5" />
          <circle cx="4" cy="18" r="1.5" />
          <circle cx="20" cy="18" r="1.5" />
          <path d="m8.1 9.8-2.8-2.7m10.6 2.7 2.8-2.7M8.1 14.2l-2.8 2.7m10.6-2.7 2.8 2.7" />
        </>
      );
    case "load-balancer":
      return (
        <>
          <circle cx="4" cy="12" r="2" />
          <rect x="17" y="3.5" width="4" height="4" rx="1" />
          <rect x="17" y="10" width="4" height="4" rx="1" />
          <rect x="17" y="16.5" width="4" height="4" rx="1" />
          <path d="M6 12h4l3-6.5h4M10 12h7M10 12l3 6.5h4" />
        </>
      );
    case "service-routing":
      return (
        <>
          <path d="M4 5h6l2 3 2-3h6v14h-6l-2-3-2 3H4V5Z" />
          <path d="M1.5 12H8m8 0h6.5M6 9.5 8.5 12 6 14.5m12-5 2.5 2.5-2.5 2.5" />
        </>
      );
    case "application-router":
      return (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 8h18M7 12h4v4h6m-2-2 2 2-2 2" />
          <circle cx="6" cy="6" r=".7" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="6" r=".7" fill="currentColor" stroke="none" />
        </>
      );
    case "data-router":
      return (
        <>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="4.5" r="1.5" fill="currentColor" />
          <circle cx="18.5" cy="15.7" r="1.5" fill="currentColor" />
          <circle cx="5.5" cy="15.7" r="1.5" fill="currentColor" />
          <path d="m9 13 3-4 3 4-3 2-3-2Z" />
        </>
      );
    case "hash-ring":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="4" r="1.4" fill="currentColor" />
          <circle cx="20" cy="12" r="1.4" fill="currentColor" />
          <circle cx="12" cy="20" r="1.4" fill="currentColor" />
          <circle cx="4" cy="12" r="1.4" fill="currentColor" />
          <path d="M6.2 6.2 17.8 17.8" />
        </>
      );
    case "browser":
      return (
        <>
          <rect x="2.5" y="4" width="19" height="16" rx="2" />
          <path d="M2.5 8h19" />
          <circle cx="12" cy="14" r="4" />
          <path d="M8 14h8m-4-4c1.2 1.1 1.8 2.5 1.8 4s-.6 2.9-1.8 4m0-8c-1.2 1.1-1.8 2.5-1.8 4s.6 2.9 1.8 4" />
          <circle cx="5.5" cy="6" r=".7" fill="currentColor" stroke="none" />
        </>
      );
    case "canvas":
      return (
        <>
          <circle cx="5" cy="16" r="2" fill="currentColor" />
          <circle cx="12" cy="5" r="2" fill="currentColor" />
          <circle cx="20" cy="15" r="2" fill="currentColor" />
          <path d="m6.2 14.4 4.6-7.8m2.7.2 5.2 6.6M7 16l11-1M4 21h16" />
        </>
      );
    case "whiteboard":
      return (
        <>
          <rect x="3" y="3" width="18" height="14" rx="2" />
          <path d="M7 21l2-4m8 4-2-4M8 8h8M8 12h4m4-1 2 2m0-2-2 2" />
          <circle cx="6" cy="8" r="1" fill="currentColor" stroke="none" />
          <circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case "workspace":
      return (
        <>
          <rect x="2.5" y="3.5" width="19" height="17" rx="2" />
          <path d="M8 3.5v17M5 7h1M5 10h1M5 13h1" />
          <rect x="11" y="7" width="7.5" height="9.5" rx="1.2" />
          <circle cx="13.5" cy="10" r="1" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
          <path d="m14.3 10.7 1.4 2" />
        </>
      );
    case "local-storage":
      return (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 8h18m-9 2v6m-3-3 3 3 3-3" />
          <path d="M7 18h10" />
          <circle cx="6" cy="6" r=".7" fill="currentColor" stroke="none" />
        </>
      );
    case "file-snapshot":
      return (
        <>
          <path d="M5 3h9l4 4v14H5V3Z" />
          <path d="M14 3v5h4M8 12h7M8 16h5" />
          <circle cx="18.5" cy="17.5" r="3" fill="white" />
          <path d="m17.2 17.5.9.9 1.8-2" />
        </>
      );
    case "template-grid":
      return (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1.2" />
          <rect x="14" y="3" width="7" height="7" rx="1.2" />
          <rect x="3" y="14" width="7" height="7" rx="1.2" />
          <path d="M17.5 14v7m-3.5-3.5h7" />
        </>
      );
    case "image":
      return (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="16.5" cy="8.5" r="2" />
          <path d="m5.5 17 4.5-5 3 3 2-2 3.5 4" />
        </>
      );
    case "import-export":
      return (
        <>
          <rect x="7" y="7" width="10" height="10" rx="2" />
          <path d="M3 5h8M8 2l3 3-3 3m13 11h-8m3 3-3-3 3-3" />
        </>
      );
    case "origin-shield":
      return (
        <>
          <ellipse cx="8" cy="7" rx="5" ry="2.5" />
          <path d="M3 7v8c0 1.4 2.2 2.5 5 2.5 1 0 2-.2 2.8-.5M3 11c0 1.4 2.2 2.5 5 2.5 1 0 1.9-.2 2.7-.5" />
          <path d="m16.5 9 4.5 2v3.2c0 3-1.7 5.2-4.5 6.8-2.8-1.6-4.5-3.8-4.5-6.8V11l4.5-2Z" />
        </>
      );
    case "control-plane":
      return (
        <>
          <path d="M4 4v16M12 4v16M20 4v16" />
          <circle cx="4" cy="9" r="2" fill="white" />
          <circle cx="12" cy="15" r="2" fill="white" />
          <circle cx="20" cy="7" r="2" fill="white" />
          <path d="M6 9h4m4 6h4M6 18l4-2m4-7 4-1" />
        </>
      );
    case "client":
      return (
        <>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8m-4-4v4M7 8h10" />
          <circle cx="6" cy="8" r=".7" fill="currentColor" stroke="none" />
        </>
      );
    case "application-server":
      return (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M4 8h16M8 13l-2 2 2 2m8-4 2 2-2 2m-5 1 2-6" />
          <circle cx="7" cy="5.5" r=".8" fill="currentColor" stroke="none" />
        </>
      );
    case "fallback":
      return (
        <>
          <rect x="3" y="4" width="14" height="6" rx="1.5" />
          <rect x="3" y="14" width="14" height="6" rx="1.5" />
          <circle cx="18" cy="17" r="4" fill="white" />
          <path d="M18 14.8V17l1.8 1" />
        </>
      );
    case "writer":
      return (
        <>
          <path d="m5 19 1.5-5.5L16 4l4 4-9.5 9.5L5 19ZM14 6l4 4M6.5 13.5l4 4M4 21h17" />
        </>
      );
    case "worker":
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3m13 0h3M5.3 5.3l2.1 2.1m9.2 9.2 2.1 2.1m0-13.4-2.1 2.1m-9.2 9.2-2.1 2.1" />
          <path d="m10.5 9.5 4 2.5-4 2.5v-5Z" fill="currentColor" stroke="none" />
        </>
      );
    case "scheduler":
      return (
        <>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l3 2M8 2.5h8M12 2.5V5" />
        </>
      );
    case "service-registry":
      return (
        <>
          <rect x="3" y="4" width="12" height="16" rx="2" />
          <path d="M6.5 8h5M6.5 12h5M6.5 16h3" />
          <circle cx="17" cy="15" r="3.5" />
          <path d="m19.5 17.5 2 2" />
        </>
      );
    case "request-coalescer":
      return (
        <>
          <path d="M3 4h4l5 8 5-8h4M3 12h4l5 2.5 5-2.5h4M3 20h4l5-3 5 3h4" />
          <circle cx="12" cy="14.5" r="2" fill="currentColor" stroke="none" />
        </>
      );
    case "policy-gate":
      return (
        <>
          <path d="M12 3 19 6v5c0 4.5-2.7 7.8-7 10-4.3-2.2-7-5.5-7-10V6l7-3Z" />
          <path d="m8.5 12 2.2 2.2 4.8-5" />
        </>
      );
    case "telemetry":
      return (
        <>
          <path d="M3 18V6m0 12h18M5 15l4-4 3 2 5-7 2 2" />
          <circle cx="9" cy="11" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="17" cy="6" r="1.2" fill="currentColor" stroke="none" />
        </>
      );
    case "key-value-store":
      return (
        <>
          <ellipse cx="15" cy="6" rx="6" ry="3" />
          <path d="M9 6v11c0 1.7 2.7 3 6 3s6-1.3 6-3V6M9 11c0 1.7 2.7 3 6 3s6-1.3 6-3" />
          <circle cx="5" cy="9" r="2.5" />
          <path d="M3.2 10.8 1.5 12.5m1.3-1.3 1.4 1.4m.1-3.1L9 8" />
        </>
      );
    case "cache":
      return (
        <>
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <path d="M8 2v3m4-3v3m4-3v3M8 19v3m4-3v3m4-3v3M2 8h3m-3 4h3m-3 4h3m14-8h3m-3 4h3m-3 4h3" />
          <path d="m13.5 7-4 6h3l-2 4 4-6h-3l2-4Z" fill="currentColor" stroke="none" />
        </>
      );
    case "database":
      return (
        <>
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
        </>
      );
    case "distributed-database":
      return (
        <>
          <ellipse cx="12" cy="5" rx="4" ry="2" />
          <path d="M8 5v4c0 1.1 1.8 2 4 2s4-.9 4-2V5" />
          <ellipse cx="5" cy="16" rx="3" ry="1.7" />
          <path d="M2 16v3c0 .9 1.3 1.7 3 1.7S8 20 8 19v-3" />
          <ellipse cx="19" cy="16" rx="3" ry="1.7" />
          <path d="M16 16v3c0 .9 1.3 1.7 3 1.7s3-.7 3-1.7v-3M10 11l-3 3m7-3 3 3" />
        </>
      );
    case "message-queue":
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <rect x="6" y="8" width="3" height="8" rx="1" />
          <rect x="10.5" y="8" width="3" height="8" rx="1" />
          <path d="M15.5 12h3m-1.5-1.5 1.5 1.5-1.5 1.5" />
        </>
      );
    case "partition":
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M9 5v14m6-14v14M5.5 9h1M11.5 12h1M17.5 9h1M17.5 15h1" />
        </>
      );
    case "replica-group":
      return (
        <>
          <circle cx="12" cy="6" r="3" />
          <circle cx="6" cy="17" r="3" />
          <circle cx="18" cy="17" r="3" />
          <path d="m10.5 8.6-3 5.8m6-5.8 3 5.8M9 17h6" />
        </>
      );
    case "leader":
      return (
        <>
          <circle cx="12" cy="6" r="3.5" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <path d="M12 9.5v3M6 15.5v-3h12v3M9.8 6h4.4" />
          <circle cx="12" cy="6" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case "process":
      return (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <rect x="7" y="8" width="10" height="8" rx="1.5" />
          <circle cx="10" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <path d="M13.5 11h2m-2 3h2" />
        </>
      );
    case "thread":
      return (
        <>
          <path d="M3 6h3c3 0 3 12 6 12s3-12 6-12h3M3 12h4c2.5 0 2.5-6 5-6s2.5 6 5 6h4M3 18h3c3 0 3-6 6-6s3 6 6 6h3" />
        </>
      );
    case "operating-system":
      return (
        <>
          <path d="m12 3 9 4-9 4-9-4 9-4Z" />
          <path d="m5 10-2 1 9 4 9-4-2-1M5 14l-2 1 9 4 9-4-2-1" />
          <circle cx="12" cy="7" r="1.3" fill="currentColor" stroke="none" />
        </>
      );
    case "runtime":
      return (
        <>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="m10 8 6 4-6 4V8Z" fill="currentColor" stroke="none" />
        </>
      );
    case "network-socket":
      return (
        <>
          <path d="M3 6h6v5H3V6Zm12 7h6v5h-6v-5ZM5 3v3m2-3v3m10 12v3m2-3v3M9 8.5h3v7h3" />
        </>
      );
    case "file-system":
      return (
        <>
          <path d="M3 7h7l2 2h9v10H3V7Z" />
          <circle cx="8" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="16" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="17" r="1.3" fill="currentColor" stroke="none" />
          <path d="M8 13.3v1.2h8v-1.2M12 14.5V16" />
        </>
      );
    case "server":
      return (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M4 9h16M4 15h16M8 6h8M8 12h8M8 18h8" />
          <circle cx="6.5" cy="6" r=".8" fill="currentColor" stroke="none" />
          <circle cx="6.5" cy="12" r=".8" fill="currentColor" stroke="none" />
          <circle cx="6.5" cy="18" r=".8" fill="currentColor" stroke="none" />
        </>
      );
    case "cpu":
      return (
        <>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
          <path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4" />
        </>
      );
    case "memory":
      return (
        <>
          <rect x="3" y="6" width="18" height="11" rx="2" />
          <rect x="6" y="9" width="3" height="5" rx=".5" />
          <rect x="10.5" y="9" width="3" height="5" rx=".5" />
          <rect x="15" y="9" width="3" height="5" rx=".5" />
          <path d="M6 17v3m4-3v3m4-3v3m4-3v3" />
        </>
      );
    case "disk":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path d="m14.2 9.8 4.3-4.3M14 14l5 3M12 12l5-1" />
          <circle cx="17" cy="11" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case "network-interface":
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M6 9h7v7H6V9Zm2-4V2m3 3V2m5 8c1.7 0 3 1.3 3 3m-3 0h.01" />
          <circle cx="16" cy="13" r=".9" fill="currentColor" stroke="none" />
        </>
      );
    case "rack":
      return (
        <>
          <rect x="3" y="2.5" width="18" height="19" rx="1.5" />
          <rect x="6" y="5" width="12" height="3.5" rx=".8" />
          <rect x="6" y="10.3" width="12" height="3.5" rx=".8" />
          <rect x="6" y="15.5" width="12" height="3.5" rx=".8" />
          <path d="M15.5 6.8h.01m-.01 5.2h.01m-.01 5.3h.01" strokeWidth="2.5" />
        </>
      );
    default:
      return (
        <>
          <path d="m12 3 9 9-9 9-9-9 9-9Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      );
  }
}

/** Renders a compact, native SVG mark for a saved semantic system node. */
export function SystemIcon({
  iconId,
  size = 24,
  color,
  title,
  style,
  width,
  height,
  ...svgProps
}: SystemIconProps) {
  return (
    <svg
      {...svgProps}
      viewBox="0 0 24 24"
      width={width ?? size}
      height={height ?? size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={{ color, ...style }}
    >
      {title ? <title>{title}</title> : null}
      <g
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        <IconArtwork iconId={iconId} />
      </g>
    </svg>
  );
}

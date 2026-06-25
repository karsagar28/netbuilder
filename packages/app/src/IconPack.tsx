import type { NodeKind } from '@netbuilder/sim';

type IconName = NodeKind | 'tick' | 'research' | 'balancer' | 'reset' | 'serverPod';

interface CozyIconProps {
  name: IconName;
  size?: number;
}

const INK = '#2c2335';

export function CozyIcon({ name, size = 28 }: CozyIconProps) {
  return (
    <svg className="cozyIcon" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {iconBody(name)}
    </svg>
  );
}

function iconBody(name: IconName) {
  switch (name) {
    case 'border':
      return <CloudGate />;
    case 'switch':
      return <TrafficGarden />;
    case 'load_balancer':
    case 'balancer':
      return <SmoothieBalancer />;
    case 'server':
    case 'serverPod':
      return <ServerPod />;
    case 'tick':
      return <TickBeat />;
    case 'research':
      return <ResearchBook />;
    case 'reset':
      return <ResetSwirl />;
  }
}

function CloudGate() {
  return (
    <>
      <ellipse cx="32" cy="52" rx="21" ry="7" fill="#000" opacity=".12" />
      <path d="M18 43h29c8 0 13-5 13-12 0-6-4-11-10-12C48 10 40 5 31 8c-6 2-10 7-11 13-7 0-13 5-13 12 0 6 5 10 11 10Z" fill="#8fd0ff" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M22 35h22" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="23" cy="27" r="5" fill="#fff" opacity=".55" />
    </>
  );
}

function TrafficGarden() {
  return (
    <>
      <ellipse cx="32" cy="52" rx="21" ry="7" fill="#000" opacity=".12" />
      <rect x="12" y="20" width="40" height="27" rx="10" fill="#1fc3ac" stroke={INK} strokeWidth="5" />
      <path d="M32 40c-5-6-2-15 6-20 4 8 0 16-6 20Z" fill="#bff2ea" stroke={INK} strokeWidth="3" />
      <path d="M30 39c-7-1-11-7-10-15 8 1 13 7 10 15Z" fill="#65e0cb" stroke={INK} strokeWidth="3" />
      <path d="M32 42V25" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="19" cy="27" r="3" fill="#fff49a" stroke={INK} strokeWidth="2" />
      <circle cx="45" cy="27" r="3" fill="#fff49a" stroke={INK} strokeWidth="2" />
    </>
  );
}

function SmoothieBalancer() {
  return (
    <>
      <ellipse cx="32" cy="52" rx="21" ry="7" fill="#000" opacity=".12" />
      <path d="M19 18h26l-4 32H23L19 18Z" fill="#e8defc" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M17 18h30" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M27 18 24 8h18" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 31c8 4 16-4 19 3l-2 16H23l-2-15c1-4 2-5 3-4Z" fill="#ff9bcf" stroke={INK} strokeWidth="3" />
      <circle cx="32" cy="38" r="4" fill="#fff" opacity=".75" />
    </>
  );
}

function ServerPod() {
  return (
    <>
      <ellipse cx="32" cy="52" rx="21" ry="7" fill="#000" opacity=".12" />
      <rect x="17" y="10" width="30" height="42" rx="9" fill="#46d079" stroke={INK} strokeWidth="5" />
      <path d="M23 22h18M23 32h18M23 42h18" stroke="#167a3f" strokeWidth="4" strokeLinecap="round" />
      <circle cx="38" cy="16" r="4" fill="#eaffd6" stroke={INK} strokeWidth="2" />
      <path d="M20 11h20" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".55" />
    </>
  );
}

function TickBeat() {
  return (
    <>
      <rect x="9" y="9" width="46" height="46" rx="14" fill="#bfe8ff" stroke={INK} strokeWidth="5" />
      <path d="M25 20v24l18-12-18-12Z" fill="#fff" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M43 21v22" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </>
  );
}

function ResearchBook() {
  return (
    <>
      <rect x="16" y="13" width="32" height="40" rx="6" fill="#e8defc" stroke={INK} strokeWidth="5" />
      <path d="M22 16h24v32H22c-4 0-7 2-7 2V20s3-4 7-4Z" fill="#ff5ca8" stroke={INK} strokeWidth="4" />
      <path d="M24 25h14M24 34h17" stroke="#fffaf0" strokeWidth="4" strokeLinecap="round" />
      <circle cx="43" cy="45" r="5" fill="#ffc83d" stroke={INK} strokeWidth="3" />
    </>
  );
}

function ResetSwirl() {
  return (
    <>
      <rect x="9" y="9" width="46" height="46" rx="14" fill="#ffe3c9" stroke={INK} strokeWidth="5" />
      <path d="M43 24c-6-8-20-7-25 3-5 11 6 22 17 17 4-2 7-5 8-9" fill="none" stroke="#f7913a" strokeWidth="6" strokeLinecap="round" />
      <path d="M44 15v12H32" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

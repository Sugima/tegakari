interface IconProps {
  color: string
  size?: number
}

function svgProps(size: number, color: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
}

export function InboxIcon({ color, size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

export function CopyIcon({ color, size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export function TrashIcon({ color, size = 12 }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export function DownloadIcon({ color, size = 12 }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export function UploadIcon({ color, size = 12 }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

export function ImageIcon({ color, size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

export function ChevronDownIcon({ color, size = 10 }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function CloseIcon({ color, size = 14 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function GripIcon({ color, size = 12 }: IconProps) {
  return (
    <svg {...svgProps(size, color)} strokeWidth={2.5}>
      <circle cx="9" cy="5" r="0.5" />
      <circle cx="9" cy="12" r="0.5" />
      <circle cx="9" cy="19" r="0.5" />
      <circle cx="15" cy="5" r="0.5" />
      <circle cx="15" cy="12" r="0.5" />
      <circle cx="15" cy="19" r="0.5" />
    </svg>
  )
}

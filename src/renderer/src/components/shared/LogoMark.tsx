interface LogoMarkProps {
  className?: string
}

export function LogoMark({ className = 'h-8 w-8' }: LogoMarkProps): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className={`shrink-0 rounded-[10px] border border-white/10 bg-[#10151d] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${className}`}
    >
      <path
        d="M16 3.5 25.95 9v11L16 26.5 6.05 20V9Z"
        fill="#E11D2E"
        stroke="#F7FAFC"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M16 8.2 21.8 11.5v6.9L16 21.8l-5.8-3.4v-6.9Z"
        fill="#FFF8F8"
        stroke="#0A0D12"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="m14 11.8 5.2 4.2-5.2 4.2Z" fill="#0A0D12" />
    </svg>
  )
}

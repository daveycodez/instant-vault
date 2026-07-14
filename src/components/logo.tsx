import type { SVGProps } from "react"

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="512"
      height="512"
      viewBox="0 0 512 512"
      fill="none"
      aria-label="InstantVault"
      className={className}
      {...props}
    >
      <rect width="512" height="512" fill="black" />
      <polygon
        points="97.0973,91.3297 197.0973,91.3297 247.0973,201.3297 297.0973,91.3297 397.0973,91.3297 247.0973,421.3297"
        fill="white"
      />
    </svg>
  )
}

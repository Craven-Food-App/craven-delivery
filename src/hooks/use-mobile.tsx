import * as React from "react"

/** Align with Tailwind `lg` — tablet widths use mobile layout. */
const MOBILE_BREAKPOINT = 1024

function readIsMobile(): boolean {
  if (typeof window === "undefined") return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(readIsMobile)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(readIsMobile())
    }
    mql.addEventListener("change", onChange)
    setIsMobile(readIsMobile())
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

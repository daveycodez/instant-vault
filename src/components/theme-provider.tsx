import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"

const THEME_STORAGE_KEY = "heroui-theme"
const PREFERS_DARK_MEDIA = "(prefers-color-scheme: dark)"

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

function subscribeSystemPreference(callback: () => void) {
  if (typeof window === "undefined") return () => {}
  const media = window.matchMedia(PREFERS_DARK_MEDIA)
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

function getSystemPreference() {
  return window.matchMedia?.(PREFERS_DARK_MEDIA).matches ? "dark" : "light"
}

function getServerSystemPreference() {
  return undefined
}

function applyThemeToDOM(resolved: string, previous: string | undefined) {
  if (previous === resolved) return
  if (previous) {
    document.documentElement.classList.remove(previous)
  }
  document.documentElement.classList.add(resolved)
  document.documentElement.setAttribute("data-theme", resolved)
}

interface ThemeContextValue {
  theme: string
  resolvedTheme: string | undefined
  setTheme: (theme: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within <ThemeProvider>")
  }
  return context
}

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("heroui-theme");if(!t||t==="system"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}var d=document.documentElement;d.classList.add(t);d.dataset.theme=t;}catch(e){}})();`

export interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: string
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === "undefined") return defaultTheme
    return localStorage.getItem(THEME_STORAGE_KEY) ?? defaultTheme
  })

  const systemTheme = useSyncExternalStore(
    subscribeSystemPreference,
    getSystemPreference,
    getServerSystemPreference,
  )

  const resolvedTheme = theme === "system" ? systemTheme : theme

  const appliedRef = useRef<string | undefined>(undefined)

  useIsomorphicLayoutEffect(() => {
    if (!resolvedTheme) return
    applyThemeToDOM(resolvedTheme, appliedRef.current)
    appliedRef.current = resolvedTheme
  }, [resolvedTheme])

  const setTheme = useCallback((newTheme: string) => {
    if (typeof window === "undefined") return
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    setThemeState(newTheme)
  }, [])

  useEffect(() => {
    if (!disableTransitionOnChange || !resolvedTheme) return

    const style = document.createElement("style")
    style.appendChild(
      document.createTextNode(
        "*,*::before,*::after{transition:none!important}",
      ),
    )
    document.head.appendChild(style)
    window.getComputedStyle(document.body)
    const timeout = window.setTimeout(() => style.remove(), 1)

    return () => window.clearTimeout(timeout)
  }, [resolvedTheme, disableTransitionOnChange])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static theme init script, no user input
        dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
      />
      {children}
    </ThemeContext.Provider>
  )
}

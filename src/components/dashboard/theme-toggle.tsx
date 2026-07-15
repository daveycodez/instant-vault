import { Moon, Sun } from "@gravity-ui/icons"
import { useTheme } from "@heroui/react"
import { IconButton } from "./icon-button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme("system")
  const isDark = resolvedTheme === "dark"

  return (
    <IconButton
      label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      size="sm"
      variant="tertiary"
      onPress={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </IconButton>
  )
}

import { Display, Moon, Sun } from "@gravity-ui/icons"
import type { Selection } from "@heroui/react"
import { Button, Dropdown, Label } from "@heroui/react"
import { useTheme } from "@/components/theme-provider"

const THEME_OPTIONS = [
  { id: "system", label: "System", Icon: Display },
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const onSelectionChange = (keys: Selection) => {
    const [next] = keys as Set<string>
    if (next) setTheme(next)
  }

  return (
    <Dropdown>
      <Button isIconOnly aria-label="Change theme" size="sm" variant="ghost">
        <Sun className="size-4 dark:hidden" />
        <Moon className="hidden size-4 dark:block" />
      </Button>

      <Dropdown.Popover className="min-w-fit">
        <Dropdown.Menu
          aria-label="Theme"
          selectionMode="single"
          selectedKeys={[theme]}
          onSelectionChange={onSelectionChange}
        >
          {THEME_OPTIONS.map(({ id, label, Icon }) => (
            <Dropdown.Item key={id} id={id} textValue={label}>
              <Icon />
              <Label>{label}</Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}

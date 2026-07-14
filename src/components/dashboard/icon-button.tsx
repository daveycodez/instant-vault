import { Button, Tooltip } from "@heroui/react"
import type { ComponentPropsWithRef, ReactNode } from "react"

type ButtonProps = ComponentPropsWithRef<typeof Button>

export interface IconButtonProps
  extends Omit<ButtonProps, "children" | "isIconOnly"> {
  /** Accessible label AND default tooltip text. */
  label: string
  /** Override the tooltip content if it should differ from the aria-label. */
  tooltip?: ReactNode
  children: ReactNode
}

export function IconButton({
  children,
  label,
  tooltip,
  ...buttonProps
}: IconButtonProps) {
  return (
    <Tooltip>
      <Button isIconOnly aria-label={label} {...buttonProps}>
        {children}
      </Button>
      <Tooltip.Content>{tooltip ?? label}</Tooltip.Content>
    </Tooltip>
  )
}

import * as React from "react";

/**
 * Minimal `Slot` implementation (Radix-style) so components can support an
 * `asChild` prop without pulling in an extra dependency. Merges the slot's
 * props/className onto its single child element.
 */
export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

export const Slot = React.forwardRef<HTMLElement, SlotProps>(
  ({ children, ...props }, ref) => {
    if (!React.isValidElement(children)) {
      return null;
    }

    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = child.props;

    const mergedClassName = [props.className, childProps.className as string | undefined]
      .filter(Boolean)
      .join(" ");

    return React.cloneElement(child, {
      ...props,
      ...childProps,
      className: mergedClassName || undefined,
      ref,
    } as Record<string, unknown>);
  },
);
Slot.displayName = "Slot";

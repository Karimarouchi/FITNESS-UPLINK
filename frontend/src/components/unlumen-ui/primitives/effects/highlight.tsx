import * as React from "react";
import { motion } from "framer-motion";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Bounds = { top: number; left: number; width: number; height: number };

type HighlightContextValue = {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  register: (id: string, node: HTMLElement | null) => void;
};

const HighlightContext = React.createContext<HighlightContextValue | null>(null);

type HighlightProps = {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  hover?: boolean;
  controlledItems?: boolean;
  mode?: "parent" | "children";
  style?: React.CSSProperties;
};

export function Highlight({
  children,
  className,
  containerClassName,
  hover = true,
  style,
}: HighlightProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const itemsRef = React.useRef(new Map<string, HTMLElement>());
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [bounds, setBounds] = React.useState<Bounds | null>(null);

  const register = React.useCallback((id: string, node: HTMLElement | null) => {
    if (node) {
      itemsRef.current.set(id, node);
      return;
    }
    itemsRef.current.delete(id);
  }, []);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!activeId || !container) {
      setBounds(null);
      return;
    }
    const node = itemsRef.current.get(activeId);
    if (!node) {
      setBounds(null);
      return;
    }
    const parent = container.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    setBounds({
      top: rect.top - parent.top,
      left: rect.left - parent.left,
      width: rect.width,
      height: rect.height,
    });
  }, [activeId]);

  const contextValue = React.useMemo(
    () => ({ activeId, setActiveId, register }),
    [activeId, register],
  );

  return (
    <HighlightContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={cn("relative", containerClassName)}
        onPointerLeave={hover ? () => setActiveId(null) : undefined}
      >
        {bounds ? (
          <motion.div
            className={cn("absolute", className)}
            style={style}
            initial={false}
            animate={bounds}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        ) : null}
        {children}
      </div>
    </HighlightContext.Provider>
  );
}

type HighlightItemProps = React.ComponentPropsWithRef<"div"> & {
  asChild?: boolean;
};

export function HighlightItem({ asChild = false, className, onPointerEnter, ...props }: HighlightItemProps) {
  const context = React.useContext(HighlightContext);
  const id = React.useId();
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      className={cn("relative", className)}
      {...props}
      ref={(node: HTMLElement | null) => context?.register(id, node)}
      onPointerEnter={(event) => {
        context?.setActiveId(id);
        onPointerEnter?.(event as React.PointerEvent<HTMLDivElement>);
      }}
    />
  );
}

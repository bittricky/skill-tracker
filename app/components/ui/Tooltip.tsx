import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  /** Tooltip text shown on hover/focus. */
  label: string;
  /** Trigger content that the tooltip describes. */
  children: ReactNode;
  className?: string;
}

interface Coords {
  top: number;
  left: number;
}

/**
 * Horizon UI–style tooltip rendered via a portal so it escapes any
 * `overflow:hidden` ancestor (e.g. cards). Appears above the trigger
 * with a small downward-pointing arrow.
 */
export function Tooltip({ label, children, className = "" }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({
      top: r.top, // tooltip's bottom edge sits 8px above this point
      left: r.left + r.width / 2,
    });
  }, []);

  const show = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, updatePosition]);

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        aria-label={label}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={`relative inline-flex cursor-help outline-none ${className}`}
      >
        {children}
      </span>
      {mounted &&
        open &&
        coords &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top - 8,
              left: coords.left,
              transform: "translate(-50%, -100%)",
              pointerEvents: "none",
              zIndex: 1000,
            }}
            className="whitespace-nowrap rounded-md bg-brand-ink text-brand-bg text-[10.5px] font-medium px-2 py-1 shadow-md"
          >
            {label}
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                top: "100%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop: "4px solid var(--color-brand-ink)",
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

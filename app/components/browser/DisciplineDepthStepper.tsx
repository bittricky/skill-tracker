import type { DepthTier } from "~/lib/depth";
import { getDepthColor, getDepthLabel } from "~/lib/depth";
import { Pixel } from "~/components/ui/Pixel";

interface DisciplineDepthStepperProps {
  tier: DepthTier;
  donePct: number;
}

const TIERS: DepthTier[] = ["exploring", "practicing", "fluent"];

export function DisciplineDepthStepper({
  tier,
  donePct,
}: DisciplineDepthStepperProps) {
  const activeIndex = TIERS.indexOf(tier);

  return (
    <div className="w-full max-w-md">
      {/* Stepper */}
      <div className="flex items-center">
        {TIERS.map((t, i) => {
          const reached = i <= activeIndex;
          const isActive = i === activeIndex;
          const color = getDepthColor(t);
          return (
            <div key={t} className="flex items-center flex-1 last:flex-none">
              <Node reached={reached} active={isActive} color={color} />
              {i < TIERS.length - 1 && (
                <Connector
                  filled={i < activeIndex}
                  color={getDepthColor(TIERS[i + 1])}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels under nodes */}
      <div className="flex items-center mt-3">
        {TIERS.map((t, i) => {
          const isActive = i === activeIndex;
          return (
            <div key={t} className="flex-1 last:flex-none">
              <Pixel
                size={11}
                color={
                  isActive
                    ? t === "exploring"
                      ? "coral"
                      : t === "practicing"
                        ? "mustard"
                        : "teal"
                    : "ink-dim"
                }
                className="tracking-[0.16em]"
              >
                {getDepthLabel(t)}
              </Pixel>
            </div>
          );
        })}
      </div>

      {/* Caption */}
      <div className="mt-5">
        <Pixel size={13} color="ink-muted">
          Currently{" "}
          <span style={{ color: "var(--color-ink)" }}>
            {getDepthLabel(tier)}
          </span>
          {tier !== "fluent" && (
            <>
              {" · "}
              <span className="tabular-nums">{donePct}%</span> complete
            </>
          )}
        </Pixel>
      </div>
    </div>
  );
}

function Node({
  reached,
  active,
  color,
}: {
  reached: boolean;
  active: boolean;
  color: string;
}) {
  return (
    <div
      className="w-3.5 h-3.5 rounded-full shrink-0 transition-colors"
      style={{
        background: reached ? color : "var(--color-surface-bg)",
        border: `2px solid ${reached ? color : "var(--color-surface-border)"}`,
        boxShadow: active ? `0 0 0 4px ${color}22` : "none",
      }}
      aria-hidden="true"
    />
  );
}

function Connector({ filled, color }: { filled: boolean; color: string }) {
  return (
    <div
      className="flex-1 h-0.5 mx-1 rounded-full"
      style={{
        background: filled ? color : "var(--color-surface-border)",
      }}
      aria-hidden="true"
    />
  );
}

import { Link, useLocation } from "react-router";
import { getSidebarGroups } from "~/lib/sidebarGroups";
import { disciplineStats } from "~/lib/progress";
import type { ProgressMap } from "~/lib/storage";

interface AppSidebarProps {
  progress: ProgressMap;
  /** Currently selected discipline id (only relevant on /browser). */
  activeDisciplineId?: string;
}

export function AppSidebar({ progress, activeDisciplineId }: AppSidebarProps) {
  const location = useLocation();
  const groups = getSidebarGroups();
  const onDashboard = location.pathname === "/";
  const onBrowser = location.pathname === "/browser";

  return (
    <aside className="w-60 shrink-0 flex flex-col py-10 px-6">
      {/* Brand */}
      <div className="mb-10">
        <Link
          to="/"
          className="text-[15px] font-semibold tracking-tight text-brand-primary hover:opacity-80 transition-opacity"
        >
          Skill Tracker
        </Link>
      </div>

      {/* MAIN nav */}
      <SectionLabel>Main</SectionLabel>
      <nav className="flex flex-col gap-1 mb-8">
        <NavLink to="/" label="Dashboard" active={onDashboard} />
        <NavLink to="/browser" label="Browser" active={onBrowser} />
      </nav>

      {/* Discipline groups */}
      <div className="flex flex-col overflow-y-auto scroll-soft -mx-2 px-2 min-h-0">
        {groups.map((group) => (
          <div key={group.kind} className="mb-7">
            <SectionLabel>{group.label}</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {group.disciplines.map((d) => {
                const stats = disciplineStats(d, progress);
                const isActive = onBrowser && activeDisciplineId === d.id;
                return (
                  <Link
                    key={d.id}
                    to={`/browser?discipline=${d.id}`}
                    className={`flex flex-col gap-1.5 py-1 transition-colors ${
                      isActive
                        ? "text-brand-ink"
                        : "text-brand-muted hover:text-brand-ink"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: d.color }}
                        aria-hidden="true"
                      />
                      <span
                        className={`flex-1 truncate text-[12.5px] ${
                          isActive ? "font-semibold" : ""
                        }`}
                      >
                        {d.label}
                      </span>
                      <span className="text-[10.5px] text-brand-dim tabular-nums">
                        {stats.pct}%
                      </span>
                    </div>
                    <div
                      className="ml-4 h-[3px] rounded-full overflow-hidden"
                      style={{ background: "var(--color-brand-line-soft)" }}
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{
                          width: `${stats.pct}%`,
                          background: d.color,
                        }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-dim mb-3">
      {children}
    </div>
  );
}

interface NavLinkProps {
  to: string;
  label: string;
  active: boolean;
}

function NavLink({ to, label, active }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={`flex items-center text-[13px] py-1 transition-colors ${
        active
          ? "text-brand-primary font-semibold"
          : "text-brand-muted hover:text-brand-ink"
      }`}
    >
      <span className="flex-1">{label}</span>
    </Link>
  );
}

import type { HeroStat } from "../data";

type StatsPanelProps = {
  stats: HeroStat[];
};

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <aside className="fu-stats" aria-label="Chiffres clés">
      {stats.map((stat) => (
        <div className="fu-stat" key={stat.label}>
          <span className="fu-stat-value">{stat.value}</span>
          <span className="fu-stat-label">{stat.label}</span>
        </div>
      ))}
    </aside>
  );
}

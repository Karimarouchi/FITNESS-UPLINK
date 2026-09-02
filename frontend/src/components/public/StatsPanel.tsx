import { HERO_STATS } from "./publicData";

type StatsPanelProps = {
  stats?: typeof HERO_STATS;
};

export function StatsPanel({ stats = HERO_STATS }: StatsPanelProps) {
  return (
    <div className="stat-col">
      {stats.map((stat) => (
        <div className="stat" key={stat.label}>
          <div className="num">{stat.value}</div>
          <div className="lbl">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

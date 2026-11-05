import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChartLine,
  ChevronRight,
  Clock,
  Globe,
  Lock,
  MessagesSquare,
  PackageX,
  ShieldCheck,
  Store,
  TrendingDown,
  TrendingUp,
  UserPlus,
  UserRound,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission, type AuthUser } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { fetchVerifications, type VerificationAccount } from "@/features/admin/api";
import { fetchUsers } from "@/features/users/api";
import { fetchAdminMarketplaceStats, type AdminMarketplaceStats } from "@/features/marketplace/api";
import { compactNumber, timeAgo } from "@/features/marketplace/format";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { lucideFor } from "@/components/layout/shell/navIcons";
import { ADMIN_CONFIG, ADMIN_MODULES } from "./adminNav";
import { DashSelect } from "./dash/DashSelect";
import { DonutChart } from "./dash/DonutChart";
import { RegistrationsChart } from "./dash/RegistrationsChart";
import {
  CHART_RANGES,
  PERIODS,
  accountStatuses,
  countryRows,
  isBlocked,
  isVerifiedAccount,
  percentOf,
  registrationBuckets,
  signupGrowth,
  type ChartRange,
  type PeriodKey,
} from "./dash/dashData";

const COUNTRY_COLORS = ["var(--bt-bar-1)", "var(--bt-bar-2)", "var(--bt-bar-3)", "var(--bt-bar-4)"];
const DONUT_COLORS = { verified: "var(--bt-orange)", pending: "var(--bt-donut-blue)", blocked: "var(--bt-donut-rose)" } as const;

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const width = 120;
  const height = 44;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const pts = values.map((value, index) => `${index * step},${height - 4 - (value / max) * (height - 10)}`);
  return (
    <svg className="bo-dash-spark" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={`0,${height} ${pts.join(" ")} ${width},${height}`} className="bo-dash-spark-fill" />
      <polyline points={pts.join(" ")} className="bo-dash-spark-line" fill="none" />
    </svg>
  );
}

function Ring({ percent, tone }: { percent: number; tone: "orange" | "blue" | "rose" }) {
  const radius = 20;
  const circ = 2 * Math.PI * radius;
  return (
    <svg className={`bo-dash-ring is-${tone}`} viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r={radius} className="bo-dash-ring-bg" />
      <circle
        cx="26"
        cy="26"
        r={radius}
        className="bo-dash-ring-fg"
        strokeDasharray={`${(percent / 100) * circ} ${circ}`}
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle">
        {percent}%
      </text>
    </svg>
  );
}

function Badge({ tone, children }: { tone: "up" | "down" | "flat" | "info"; children: ReactNode }) {
  return <span className={`bo-dash-badge is-${tone}`}>{children}</span>;
}

type KpiProps = {
  to: string;
  icon: ReactNode;
  tone: "orange" | "blue" | "rose";
  label: string;
  value: ReactNode;
  badge?: ReactNode;
  hint: string;
  visual?: ReactNode;
  loading: boolean;
};

function Kpi({ to, icon, tone, label, value, badge, hint, visual, loading }: KpiProps) {
  return (
    <Link className="bo-dash-kpi" to={to}>
      <span className={`bo-dash-icon is-${tone}`}>{icon}</span>
      <span className="bo-dash-kpi-label">{label}</span>
      {loading ? (
        <span className="bo-skeleton bo-dash-kpi-skel" />
      ) : (
        <>
          <span className="bo-dash-kpi-value">{value}</span>
          <span className="bo-dash-kpi-meta">
            {badge}
            <small>{hint}</small>
          </span>
        </>
      )}
      <span className="bo-dash-kpi-visual">{loading ? null : visual}</span>
    </Link>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AuthUser[] | null>(null);
  const [pending, setPending] = useState<VerificationAccount[] | null>(null);
  const [pendingFailed, setPendingFailed] = useState(false);
  const [market, setMarket] = useState<AdminMarketplaceStats | null>(null);
  const [marketLoaded, setMarketLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [range, setRange] = useState<ChartRange>("6m");

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => {
        setUsers([]);
        setError("Impossible de charger les utilisateurs.");
      });
    fetchVerifications("all", "pending")
      .then(setPending)
      .catch(() => {
        setPending([]);
        setPendingFailed(true);
      });
    fetchAdminMarketplaceStats()
      .then(setMarket)
      .catch(() => setMarket(null))
      .finally(() => setMarketLoaded(true));
  }, []);

  const list = useMemo(() => users ?? [], [users]);
  const loading = users === null;
  const total = list.length;
  const blocked = list.filter(isBlocked).length;
  const active = total - blocked;
  const verified = list.filter(isVerifiedAccount).length;
  const growth = useMemo(() => signupGrowth(list, period), [list, period]);
  const periodMeta = PERIODS.find((item) => item.value === period) ?? PERIODS[0];
  const buckets = useMemo(() => registrationBuckets(list, range), [list, range]);
  const spark = useMemo(() => registrationBuckets(list, "30d").slice(-14).map((bucket) => bucket.count), [list]);
  const statuses = useMemo(() => accountStatuses(list), [list]);
  const countries = useMemo(() => countryRows(list), [list]);
  const maxCountry = Math.max(1, ...countries.map((row) => row.count));
  const recent = useMemo(
    () => [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4),
    [list],
  );

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const canUsers = hasPermission(user, PERMS.ADMIN_USERS);
  const canVerify = hasPermission(user, PERMS.ADMIN_VERIFICATIONS);
  const canModules = hasPermission(user, PERMS.ADMIN_MODULES);

  const growthBadge =
    growth.percent === null ? (
      growth.current > 0 ? (
        <Badge tone="up">+{growth.current}</Badge>
      ) : (
        <Badge tone="flat">0</Badge>
      )
    ) : growth.percent > 0 ? (
      <Badge tone="up">
        <TrendingUp size={12} aria-hidden="true" /> {growth.percent} %
      </Badge>
    ) : growth.percent < 0 ? (
      <Badge tone="down">
        <TrendingDown size={12} aria-hidden="true" /> {Math.abs(growth.percent)} %
      </Badge>
    ) : (
      <Badge tone="flat">0 %</Badge>
    );

  type Action = {
    key: string;
    to: string;
    icon: ReactNode;
    title: string;
    sub: string;
    count: number | null;
    urgent: boolean;
  };
  const actions: Action[] = [];
  if (canVerify) {
    actions.push({
      key: "verifications",
      to: "/admin/verifications",
      icon: <ShieldCheck size={18} />,
      title: "Vérifications en attente",
      sub: pendingFailed ? "Impossible de charger les dossiers" : "Dossiers à examiner",
      count: pending === null || pendingFailed ? null : pending.length,
      urgent: true,
    });
  }
  if (canModules) {
    actions.push(
      {
        key: "hidden",
        to: "/admin/marketplace",
        icon: <PackageX size={18} />,
        title: "Articles masqués",
        sub: "Marketplace · modération",
        count: market ? market.hidden : null,
        urgent: true,
      },
      {
        key: "drafts",
        to: "/admin/marketplace",
        icon: <Clock size={18} />,
        title: "Articles en brouillon",
        sub: "Marketplace · non publiés",
        count: market ? market.inactive : null,
        urgent: false,
      },
      {
        key: "conversations",
        to: "/admin/marketplace",
        icon: <MessagesSquare size={18} />,
        title: "Nouvelles conversations",
        sub: "Marketplace · 7 derniers jours",
        count: market ? market.newConversations7d : null,
        urgent: false,
      },
    );
  }
  if (canUsers) {
    actions.push({
      key: "blocked",
      to: "/users",
      icon: <Lock size={18} />,
      title: "Comptes bloqués",
      sub: "Utilisateurs à revoir",
      count: loading ? null : blocked,
      urgent: false,
    });
  }

  return (
    <section className="bo-dash">
      <header className="bo-dash-head">
        <div>
          <h1>Dashboard</h1>
          <p>Vue d’ensemble de votre plateforme Uplink Fitness. Suivez vos performances en temps réel.</p>
        </div>
        <DashSelect
          label="Période"
          value={period}
          options={PERIODS}
          onChange={setPeriod}
          icon={<CalendarDays size={17} aria-hidden="true" />}
        />
      </header>

      {error ? <p className="bo-dash-error">{error}</p> : null}

      <div className="bo-dash-kpis">
        <Kpi
          to="/users"
          icon={<Users size={22} />}
          tone="orange"
          label={`Utilisateurs inscrits`}
          value={compactNumber(total)}
          badge={growthBadge}
          hint={periodMeta.vs}
          visual={<Sparkline values={spark} />}
          loading={loading}
        />
        <Kpi
          to="/users"
          icon={<UserRound size={22} />}
          tone="orange"
          label="Utilisateurs actifs"
          value={compactNumber(active)}
          badge={<Badge tone="info">{percentOf(active, total)} %</Badge>}
          hint="des comptes, non bloqués"
          visual={<Ring percent={percentOf(active, total)} tone="orange" />}
          loading={loading}
        />
        <Kpi
          to={canVerify ? "/admin/verifications" : "/users"}
          icon={<BadgeCheck size={22} />}
          tone="blue"
          label="Comptes vérifiés"
          value={compactNumber(verified)}
          badge={<Badge tone="info">{percentOf(verified, total)} %</Badge>}
          hint={`sur ${compactNumber(total)} comptes`}
          visual={<Ring percent={percentOf(verified, total)} tone="blue" />}
          loading={loading}
        />
        <Kpi
          to="/users"
          icon={<Lock size={22} />}
          tone="rose"
          label="Comptes bloqués"
          value={compactNumber(blocked)}
          badge={<Badge tone={blocked > 0 ? "down" : "flat"}>{percentOf(blocked, total)} %</Badge>}
          hint={blocked > 0 ? "à examiner" : "aucun compte bloqué"}
          visual={<Ring percent={percentOf(blocked, total)} tone="rose" />}
          loading={loading}
        />
      </div>

      <div className="bo-dash-row">
        <article className="bo-dash-card bo-dash-card--chart">
          <header className="bo-dash-card-head">
            <span className="bo-dash-icon is-orange">
              <ChartLine size={20} />
            </span>
            <div>
              <h2>Évolution des inscriptions</h2>
              <p>Nombre de nouveaux utilisateurs inscrits sur votre plateforme</p>
            </div>
            <DashSelect label="Plage du graphique" value={range} options={CHART_RANGES} onChange={setRange} />
          </header>
          {loading ? (
            <div className="bo-skeleton bo-dash-block" />
          ) : (
            <RegistrationsChart buckets={buckets} />
          )}
        </article>

        <article className="bo-dash-card bo-dash-card--donut">
          <header className="bo-dash-card-head">
            <span className="bo-dash-icon is-orange">
              <Users size={20} />
            </span>
            <div>
              <h2>Répartition des utilisateurs</h2>
              <p>Statut des comptes sur la plateforme</p>
            </div>
          </header>
          {loading ? (
            <div className="bo-skeleton bo-dash-block" />
          ) : total === 0 ? (
            <div className="bo-dash-empty">
              <Users size={22} aria-hidden="true" />
              <p>Aucun utilisateur pour le moment.</p>
            </div>
          ) : (
            <div className="bo-dash-donut-wrap">
              <DonutChart
                centerLabel="Utilisateurs"
                slices={statuses.map((status) => ({
                  key: status.key,
                  label: status.label,
                  value: status.count,
                  color: DONUT_COLORS[status.key],
                }))}
              />
              <ul className="bo-dash-legend">
                {statuses.map((status) => (
                  <li key={status.key}>
                    <i style={{ background: DONUT_COLORS[status.key] }} aria-hidden="true" />
                    <span>{status.label}</span>
                    <em>{percentOf(status.count, total)} %</em>
                    <strong>{status.count}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      </div>

      <div className="bo-dash-trio">
        <article className="bo-dash-card">
          <header className="bo-dash-card-head is-compact">
            <Globe size={22} className="bo-dash-head-icon is-blue" aria-hidden="true" />
            <h2>Inscriptions par pays</h2>
            {canUsers ? (
              <Link className="bo-dash-link" to="/users">
                Voir tous <ArrowRight size={14} aria-hidden="true" />
              </Link>
            ) : null}
          </header>
          {loading ? (
            <div className="bo-skeleton bo-dash-block is-short" />
          ) : countries.length === 0 ? (
            <div className="bo-dash-empty">
              <Globe size={22} aria-hidden="true" />
              <p>Aucune inscription pour le moment.</p>
            </div>
          ) : (
            <ul className="bo-dash-countries">
              {countries.map((row, index) => (
                <li key={row.key}>
                  <span className="bo-dash-flag" aria-hidden="true">
                    {row.flag ?? <Globe size={16} />}
                  </span>
                  <span className="bo-dash-country-name">{row.name}</span>
                  <span className="bo-dash-bar" aria-hidden="true">
                    <span
                      style={{
                        width: `${Math.max(6, (row.count / maxCountry) * 100)}%`,
                        background: COUNTRY_COLORS[index % COUNTRY_COLORS.length],
                      }}
                    />
                  </span>
                  <strong>{row.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="bo-dash-card">
          <header className="bo-dash-card-head is-compact">
            <Zap size={22} className="bo-dash-head-icon is-orange" aria-hidden="true" />
            <h2>Activité récente</h2>
            {canUsers ? (
              <Link className="bo-dash-link" to="/users">
                Voir tout <ArrowRight size={14} aria-hidden="true" />
              </Link>
            ) : null}
          </header>
          {loading ? (
            <div className="bo-skeleton bo-dash-block is-short" />
          ) : recent.length === 0 ? (
            <div className="bo-dash-empty">
              <Zap size={22} aria-hidden="true" />
              <p>Aucune activité pour le moment.</p>
            </div>
          ) : (
            <ul className="bo-dash-activity">
              {recent.map((item) => {
                const name = item.displayName || `${item.firstName} ${item.lastName}`.trim() || item.email;
                const status = isBlocked(item) ? "blocked" : isVerifiedAccount(item) ? "verified" : "new";
                return (
                  <li key={item.id}>
                    <Link to={`/users?q=${encodeURIComponent(item.email)}`}>
                      <ProfileAvatar uploadId={item.avatarUploadId} name={name} size={40} />
                      <span className="bo-dash-activity-copy">
                        <strong>{name}</strong>
                        <small>
                          Nouvelle inscription{item.role?.label ? ` · ${item.role.label}` : ""}
                        </small>
                      </span>
                      <span className="bo-dash-activity-meta">
                        <span className={`bo-dash-status is-${status}`} title={status === "blocked" ? "Compte bloqué" : status === "verified" ? "Compte vérifié" : "Nouveau compte"}>
                          {status === "blocked" ? <Lock size={14} /> : status === "verified" ? <BadgeCheck size={14} /> : <UserPlus size={14} />}
                        </span>
                        <time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="bo-dash-card">
          <header className="bo-dash-card-head is-compact">
            <ShieldCheck size={22} className="bo-dash-head-icon is-orange" aria-hidden="true" />
            <h2>Actions prioritaires</h2>
          </header>
          {actions.length === 0 ? (
            <div className="bo-dash-empty">
              <ShieldCheck size={22} aria-hidden="true" />
              <p>Aucune action disponible avec vos droits.</p>
            </div>
          ) : (
            <ul className="bo-dash-actions">
              {actions.map((action) => (
                <li key={action.key}>
                  <Link to={action.to}>
                    <span className={action.urgent && (action.count ?? 0) > 0 ? "bo-dash-icon is-orange" : "bo-dash-icon is-neutral"}>
                      {action.icon}
                    </span>
                    <span className="bo-dash-action-copy">
                      <strong>{action.title}</strong>
                      <small>{action.sub}</small>
                    </span>
                    {action.count === null ? (
                      <span className="bo-skeleton bo-dash-pill-skel" />
                    ) : (
                      <span className={action.urgent && action.count > 0 ? "bo-dash-count is-hot" : "bo-dash-count"}>
                        {action.count > 0 ? action.count : "À jour"}
                      </span>
                    )}
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="bo-dash-card bo-dash-quick">
        <header className="bo-dash-card-head is-compact">
          <h2>Accès rapide</h2>
          <p>{today.charAt(0).toUpperCase() + today.slice(1)}</p>
          {hasPermission(user, PERMS.ADMIN_CONFIG) ? (
            <Link className="bo-dash-link" to="/admin/config">
              Configuration <ArrowRight size={14} aria-hidden="true" />
            </Link>
          ) : null}
        </header>
        <div className="bo-dash-quick-grid">
          {[...ADMIN_MODULES, ...ADMIN_CONFIG.slice(0, 5)].map((item) => {
            const Icon = item.slug === "marketplace" ? Store : lucideFor(item.icon);
            return (
              <Link className="bo-dash-quick-item" to={item.path} key={item.path}>
                <span className="bo-dash-icon is-neutral">
                  <Icon size={18} />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.lead}</small>
                </span>
              </Link>
            );
          })}
        </div>
      </article>

      {marketLoaded && !market && canModules ? (
        <p className="bo-dash-note">Les statistiques marketplace sont momentanément indisponibles.</p>
      ) : null}
    </section>
  );
}

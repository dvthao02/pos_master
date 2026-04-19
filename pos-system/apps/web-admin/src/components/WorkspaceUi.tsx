import type { CSSProperties, ReactNode } from "react";

type ClassValue = string | false | null | undefined;

type MetricTone = "primary" | "success" | "warning" | "danger" | "accent";
type MetricDirection = "up" | "down" | "flat";

type WorkspaceHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

type SectionCardProps = {
  title?: string;
  description?: string;
  iconClass?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

type MetricTileProps = {
  label: string;
  value: ReactNode;
  helper?: string;
  trendLabel?: string;
  tone?: MetricTone;
  iconClass?: string;
  direction?: MetricDirection;
};

type ChartPoint = {
  label: string;
  value: number;
};

type LineChartCardProps = {
  title: string;
  description?: string;
  series: ChartPoint[];
  secondarySeries?: ChartPoint[];
  primaryLabel?: string;
  secondaryLabel?: string;
  actions?: ReactNode;
  emptyMessage?: string;
};

type BreakdownItem = {
  label: string;
  value: number;
  color: string;
  meta?: string;
};

type DonutBreakdownCardProps = {
  title: string;
  description?: string;
  totalLabel: string;
  totalValue: ReactNode;
  items: BreakdownItem[];
  actions?: ReactNode;
};

type ActionItem = {
  label: string;
  iconClass: string;
  onClick?: () => void;
  href?: string;
  tone?: "default" | "primary";
};

type ActionListCardProps = {
  title: string;
  description?: string;
  items: ActionItem[];
};

type FeedItem = {
  id: string;
  title: string;
  meta?: string;
  badge?: string;
  tone?: MetricTone;
};

type FeedCardProps = {
  title: string;
  description?: string;
  items: FeedItem[];
  footer?: ReactNode;
};

type RankingRow = {
  label: string;
  value: ReactNode;
};

type RankingTableCardProps = {
  title: string;
  description?: string;
  rows: RankingRow[];
  valueLabel?: string;
  footer?: ReactNode;
};

function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}

function buildLinePoints(series: ChartPoint[], width: number, height: number, padding: number) {
  if (series.length === 0) {
    return [];
  }

  const max = Math.max(...series.map((point) => point.value), 1);
  const min = Math.min(...series.map((point) => point.value), 0);
  const range = Math.max(max - min, 1);
  const step = series.length > 1 ? (width - padding * 2) / (series.length - 1) : 0;

  return series.map((point, index) => {
    const x = padding + step * index;
    const normalized = (point.value - min) / range;
    const y = height - padding - normalized * (height - padding * 2);
    return { x, y };
  });
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function buildAreaPath(points: Array<{ x: number; y: number }>, height: number, padding: number) {
  if (points.length === 0) {
    return "";
  }

  const linePath = buildLinePath(points);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  return `${linePath} L ${lastPoint.x} ${height - padding} L ${firstPoint.x} ${height - padding} Z`;
}

export function WorkspaceHeader({ eyebrow, title, description, actions, className }: WorkspaceHeaderProps) {
  return (
    <section className={cx("workspace-header", className)}>
      <div className="workspace-header-copy">
        {eyebrow ? <p className="workspace-header-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="workspace-header-actions">{actions}</div> : null}
    </section>
  );
}

export function SectionCard({
  title,
  description,
  iconClass,
  actions,
  children,
  className,
  contentClassName
}: SectionCardProps) {
  return (
    <section className={cx("panel workspace-panel", className)}>
      {title || description || actions ? (
        <div className="workspace-panel-head">
          <div className="workspace-panel-copy">
            {title ? (
              <h3>
                {iconClass ? <i className={iconClass} aria-hidden="true" /> : null}
                {title}
              </h3>
            ) : null}
            {description ? <p className="section-note">{description}</p> : null}
          </div>
          {actions ? <div className="workspace-panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cx("workspace-panel-content", contentClassName)}>{children}</div>
    </section>
  );
}

export function MetricTile({
  label,
  value,
  helper,
  trendLabel,
  tone = "primary",
  iconClass,
  direction = "flat"
}: MetricTileProps) {
  return (
    <article className={cx("metric-card", "app-stat-card", `tone-${tone}`)}>
      <div className="app-stat-icon" aria-hidden="true">
        {iconClass ? <i className={iconClass} /> : null}
      </div>
      <div className="app-stat-copy">
        <p>{label}</p>
        <strong>{value}</strong>
        {helper ? <span className="app-stat-helper">{helper}</span> : null}
        {trendLabel ? (
          <span className={cx("app-stat-trend", `trend-${direction}`)}>
            <i
              className={
                direction === "up"
                  ? "fa-solid fa-arrow-up"
                  : direction === "down"
                    ? "fa-solid fa-arrow-down"
                    : "fa-solid fa-minus"
              }
              aria-hidden="true"
            />
            {trendLabel}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function LineChartCard({
  title,
  description,
  series,
  secondarySeries,
  primaryLabel = "Chuoi chinh",
  secondaryLabel = "Chuoi phu",
  actions,
  emptyMessage = "Chua co du lieu"
}: LineChartCardProps) {
  const width = 720;
  const height = 280;
  const padding = 30;
  const primaryPoints = buildLinePoints(series, width, height, padding);
  const secondaryPoints = buildLinePoints(secondarySeries ?? [], width, height, padding);
  const chartLabels = series.map((point) => point.label);

  return (
    <SectionCard title={title} description={description} actions={actions} className="workspace-chart-panel">
      {series.length > 0 ? (
        <>
          <div className="workspace-chart-legend">
            <span>
              <i className="workspace-chart-dot primary" aria-hidden="true" />
              {primaryLabel}
            </span>
            {secondarySeries?.length ? (
              <span>
                <i className="workspace-chart-dot secondary" aria-hidden="true" />
                {secondaryLabel}
              </span>
            ) : null}
          </div>
          <div className="workspace-chart-frame">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
              <defs>
                <linearGradient id="workspace-primary-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(22, 163, 148, 0.24)" />
                  <stop offset="100%" stopColor="rgba(22, 163, 148, 0.02)" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((ratio) => (
                <line
                  key={ratio}
                  className="workspace-chart-gridline"
                  x1={padding}
                  y1={height * ratio}
                  x2={width - padding}
                  y2={height * ratio}
                />
              ))}
              {primaryPoints.length > 1 ? <path className="workspace-chart-area" d={buildAreaPath(primaryPoints, height, padding)} /> : null}
              {secondaryPoints.length > 1 ? <path className="workspace-chart-line secondary" d={buildLinePath(secondaryPoints)} /> : null}
              {primaryPoints.length > 1 ? <path className="workspace-chart-line primary" d={buildLinePath(primaryPoints)} /> : null}
              {primaryPoints.map((point, index) => (
                <circle key={`${series[index]?.label ?? index}-primary`} className="workspace-chart-point primary" cx={point.x} cy={point.y} r="4.5" />
              ))}
              {secondaryPoints.map((point, index) => (
                <circle key={`${secondarySeries?.[index]?.label ?? index}-secondary`} className="workspace-chart-point secondary" cx={point.x} cy={point.y} r="4.5" />
              ))}
            </svg>
          </div>
          <div
            className="workspace-chart-labels"
            style={{ gridTemplateColumns: `repeat(${Math.max(chartLabels.length, 1)}, minmax(0, 1fr))` }}
          >
            {chartLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </>
      ) : (
        <p className="section-note">{emptyMessage}</p>
      )}
    </SectionCard>
  );
}

export function DonutBreakdownCard({
  title,
  description,
  totalLabel,
  totalValue,
  items,
  actions
}: DonutBreakdownCardProps) {
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(items.reduce((sum, item) => sum + item.value, 0), 1);
  let offset = 0;

  return (
    <SectionCard title={title} description={description} actions={actions} className="workspace-donut-panel">
      <div className="workspace-donut-layout">
        <div className="workspace-donut-chart" aria-hidden="true">
          <svg viewBox="0 0 180 180">
            <circle className="workspace-donut-track" cx="90" cy="90" r={radius} />
            {items.map((item) => {
              const dash = (item.value / total) * circumference;
              const circle = (
                <circle
                  key={item.label}
                  className="workspace-donut-slice"
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke={item.color}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 90 90)"
                />
              );
              offset += dash;
              return circle;
            })}
          </svg>
          <div className="workspace-donut-center">
            <strong>{totalValue}</strong>
            <span>{totalLabel}</span>
          </div>
        </div>
        <div className="workspace-donut-list">
          {items.map((item) => (
            <div className="workspace-donut-item" key={item.label}>
              <span className="workspace-donut-marker" style={{ "--marker-color": item.color } as CSSProperties} />
              <div>
                <strong>{item.label}</strong>
                <span>{item.meta ?? `${item.value}`}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

export function ActionListCard({ title, description, items }: ActionListCardProps) {
  return (
    <SectionCard title={title} description={description} className="workspace-action-panel">
      <div className="workspace-action-list">
        {items.map((item) =>
          item.href ? (
            <a key={item.label} className={cx("workspace-action-item", item.tone === "primary" && "primary")} href={item.href}>
              <i className={item.iconClass} aria-hidden="true" />
              {item.label}
            </a>
          ) : (
            <button
              key={item.label}
              className={cx("workspace-action-item", item.tone === "primary" && "primary")}
              type="button"
              onClick={item.onClick}
            >
              <i className={item.iconClass} aria-hidden="true" />
              {item.label}
            </button>
          )
        )}
      </div>
    </SectionCard>
  );
}

export function FeedCard({ title, description, items, footer }: FeedCardProps) {
  return (
    <SectionCard title={title} description={description} className="workspace-feed-panel">
      <div className="workspace-feed-list">
        {items.length > 0 ? (
          items.map((item) => (
            <article key={item.id} className={cx("workspace-feed-item", item.tone && `tone-${item.tone}`)}>
              <div>
                <strong>{item.title}</strong>
                {item.meta ? <span>{item.meta}</span> : null}
              </div>
              {item.badge ? <span className="workspace-feed-badge">{item.badge}</span> : null}
            </article>
          ))
        ) : (
          <p className="section-note">Chua co du lieu.</p>
        )}
      </div>
      {footer ? <div className="workspace-card-footer">{footer}</div> : null}
    </SectionCard>
  );
}

export function RankingTableCard({ title, description, rows, valueLabel = "Gia tri", footer }: RankingTableCardProps) {
  return (
    <SectionCard title={title} description={description} className="workspace-ranking-panel">
      <div className="table-wrap">
        <table className="workspace-ranking-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Noi dung</th>
              <th>{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={`${row.label}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{row.label}</td>
                  <td>{row.value}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>Chua co du lieu.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer ? <div className="workspace-card-footer">{footer}</div> : null}
    </SectionCard>
  );
}

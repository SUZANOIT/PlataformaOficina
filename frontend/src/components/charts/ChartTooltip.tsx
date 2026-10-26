import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  chartRows,
  formatTooltipValue,
  placeTooltip,
  toChartNumber,
  type ChartTooltipRow,
  type ChartValueFormat,
} from './chartTooltipFormat';

export type {
  ChartTooltipRow,
  ChartValueFormat,
} from './chartTooltipFormat';

export {
  chartMetricRow,
  chartRow,
  chartRows,
  formatChartCount,
  formatChartCurrency,
  formatChartNumber,
  formatChartPercent,
  sharePercent,
} from './chartTooltipFormat';

type ChartHoverTag = 'div' | 'span' | 'g';

type ChartHoverProps = {
  title?: string;
  rows: ChartTooltipRow[];
  children: ReactNode;
  className?: string;
  as?: ChartHoverTag;
};

const OPEN_EVENT = 'chart-tooltip-open';

function tooltipLabel(title: string | undefined, rows: ChartTooltipRow[]) {
  return [title, ...rows.map((row) => `${row.label}: ${row.value}`)].filter(Boolean).join('. ');
}

export function ChartTooltipCard({ title, rows }: { title?: string; rows: ChartTooltipRow[] }) {
  if (!title && rows.length === 0) return null;

  return (
    <div
      role="tooltip"
      className="pointer-events-none min-w-[148px] max-w-[260px] rounded-xl border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg"
    >
      {title ? (
        <p className="mb-1.5 border-b border-border pb-1.5 text-xs font-bold leading-snug text-foreground">
          {title}
        </p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="space-y-1">
          {rows.map((row, index) => (
            <li key={`${row.label}-${index}`} className="flex items-start justify-between gap-3 text-[11px] leading-snug">
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                {row.color ? (
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                ) : null}
                <span className="truncate">{row.label}</span>
              </span>
              <span className="shrink-0 font-bold tabular-nums text-foreground">{row.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted-foreground">Sem valor</p>
      )}
    </div>
  );
}

export function ChartHover({
  title,
  rows,
  children,
  className,
  as = 'div',
}: ChartHoverProps) {
  const id = useId();
  const tipRef = useRef<HTMLDivElement>(null);
  const touchPinned = useRef(false);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const hasContent = Boolean(title) || rows.length > 0;

  const openTooltip = (x: number, y: number) => {
    setAnchor({ x, y });
    setOpen(true);
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
  };

  const closeTooltip = () => {
    touchPinned.current = false;
    setOpen(false);
  };

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail !== id) closeTooltip();
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [id]);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeTooltip();
    };
    const onScroll = () => {
      if (!touchPinned.current) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !touchPinned.current) return;
    const onPointerDown = (event: PointerEvent) => {
      const host = document.querySelector(`[data-chart-tooltip="${CSS.escape(id)}"]`);
      if (host && event.target instanceof Node && host.contains(event.target)) return;
      closeTooltip();
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [id, open]);

  useLayoutEffect(() => {
    if (!open || !anchor || !tipRef.current) return;
    const rect = tipRef.current.getBoundingClientRect();
    const next = placeTooltip(
      anchor,
      { width: rect.width, height: rect.height },
      { width: window.innerWidth, height: window.innerHeight },
    );
    setPosition((current) => (
      current && current.top === next.top && current.left === next.left ? current : next
    ));
  }, [anchor, open, rows, title]);

  const portal = open && hasContent
    ? createPortal(
        <div
          ref={tipRef}
          className="pointer-events-none fixed z-[80] motion-reduce:transition-none"
          style={{
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            opacity: position ? 1 : 0,
            transition: 'opacity 120ms ease',
          }}
        >
          <ChartTooltipCard title={title} rows={rows} />
        </div>,
        document.body,
      )
    : null;

  const classes = ['cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background', className]
    .filter(Boolean)
    .join(' ');

  const handlers = {
    tabIndex: 0,
    role: 'group' as const,
    'aria-label': tooltipLabel(title, rows),
    'data-chart-tooltip': id,
    className: classes,
    onPointerEnter: (event: ReactPointerEvent<Element>) => {
      if (event.pointerType === 'touch') return;
      touchPinned.current = false;
      openTooltip(event.clientX, event.clientY);
    },
    onPointerMove: (event: ReactPointerEvent<Element>) => {
      if (event.pointerType === 'touch') return;
      openTooltip(event.clientX, event.clientY);
    },
    onPointerLeave: (event: ReactPointerEvent<Element>) => {
      if (event.pointerType === 'touch' || touchPinned.current) return;
      setOpen(false);
    },
    onPointerDown: (event: ReactPointerEvent<Element>) => {
      if (event.pointerType !== 'touch') return;
      const next = !touchPinned.current;
      touchPinned.current = next;
      if (next) openTooltip(event.clientX, event.clientY);
      else setOpen(false);
    },
    onFocus: (event: ReactFocusEvent<Element>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      touchPinned.current = false;
      openTooltip(rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    onBlur: () => closeTooltip(),
    onKeyDown: (event: ReactKeyboardEvent<Element>) => {
      if (event.key === 'Escape') closeTooltip();
    },
  };

  if (as === 'g') {
    return (
      <g {...handlers}>
        {children}
        {portal}
      </g>
    );
  }

  const Tag = as;
  return (
    <Tag {...handlers}>
      {children}
      {portal}
    </Tag>
  );
}

type RechartsTooltipItem = {
  name?: string | number;
  value?: unknown;
  color?: string;
  fill?: string;
  stroke?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
  hide?: boolean;
};

type RechartsChartTooltipProps = {
  active?: boolean;
  payload?: RechartsTooltipItem[];
  label?: string | number;
  title?: string | ((point: Record<string, unknown> | undefined, label?: string | number) => string | undefined);
  formats?: Record<string, ChartValueFormat>;
  labels?: Record<string, string>;
  extra?: (point: Record<string, unknown>) => Array<ChartTooltipRow | null | false | undefined>;
};

function resolveTitle(
  title: RechartsChartTooltipProps['title'],
  point: Record<string, unknown> | undefined,
  label: string | number | undefined,
) {
  if (typeof title === 'function') return title(point, label);
  if (title) return title;
  if (label !== undefined && label !== null && String(label).trim() !== '') return String(label);
  if (typeof point?.name === 'string' && point.name.trim()) return point.name;
  return undefined;
}

export function RechartsChartTooltip({
  active,
  payload,
  label,
  title,
  formats,
  labels,
  extra,
}: RechartsChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  const seriesRows: ChartTooltipRow[] = [];
  payload.forEach((item) => {
    if (item.hide) return;
    const key = item.dataKey === undefined || item.dataKey === null ? '' : String(item.dataKey);
    const formatted = formatTooltipValue(formats?.[key] ?? 'number', toChartNumber(item.value));
    const seriesLabel = labels?.[key]
      ?? (item.name !== undefined && String(item.name) !== key ? String(item.name) : key || 'Valor');
    seriesRows.push({
      label: seriesLabel,
      value: formatted ?? '—',
      color: item.color || item.fill || item.stroke,
    });
  });

  const extraRows = point ? chartRows(extra?.(point) ?? []) : [];
  const resolvedTitle = resolveTitle(title, point, label);
  if (!resolvedTitle && seriesRows.length === 0 && extraRows.length === 0) return null;

  return <ChartTooltipCard title={resolvedTitle} rows={[...seriesRows, ...extraRows]} />;
}

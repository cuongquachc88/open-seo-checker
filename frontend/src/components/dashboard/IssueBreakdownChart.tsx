import * as React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const COLORS: Record<string, string> = {
  critical: 'hsl(0 84% 60%)',
  high: 'hsl(28 92% 56%)',
  medium: 'hsl(48 96% 53%)',
  low: 'hsl(199 89% 55%)',
  opportunity: 'hsl(142 76% 45%)',
};

const FALLBACK = ['hsl(217 91% 60%)', 'hsl(199 89% 55%)', 'hsl(290 80% 60%)', 'hsl(48 96% 53%)'];

interface IssueBreakdownChartProps {
  counts?: Record<string, number>;
  categoryCounts?: Record<string, number>;
}

export function IssueBreakdownChart({
  counts,
  categoryCounts,
}: IssueBreakdownChartProps) {
  const [view, setView] = React.useState<'severity' | 'category'>('severity');

  const severityData = counts
    ? Object.entries(counts)
        .filter(([, value]) => value > 0)
        .map(([key, value]) => ({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          key,
          value,
        }))
    : [];

  const categoryData = categoryCounts
    ? Object.entries(categoryCounts)
        .filter(([, value]) => value > 0)
        .map(([key, value]) => ({
          name: key.replace(/-/g, ' '),
          value,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView('severity')}
          className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
            view === 'severity'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          Severity
        </button>
        <button
          onClick={() => setView('category')}
          className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
            view === 'category'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          Category
        </button>
      </div>

      {view === 'severity' ? (
        <div className="h-[260px]">
          {severityData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No issues detected
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                >
                  {severityData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={COLORS[entry.key] ?? FALLBACK[0]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="circle"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      ) : (
        <div className="h-[260px]">
          {categoryData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No issues detected
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  width={120}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}

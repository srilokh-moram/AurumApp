import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BalancePoint } from "../types";
import { format } from "date-fns";

interface Props {
  data: BalancePoint[];
}

function fmt(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function BalanceChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
        No balance history yet
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: format(new Date(d.date), "MMM d"),
    Balance: d.balance,
    Equity: d.equity,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f0b429" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#f0b429" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradEquity" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmt} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#9ca3af" }}
          formatter={(v: number) => [fmt(v)]}
        />
        <Area type="monotone" dataKey="Balance" stroke="#f0b429" strokeWidth={2} fill="url(#gradBalance)" dot={false} />
        <Area type="monotone" dataKey="Equity"  stroke="#10b981" strokeWidth={2} fill="url(#gradEquity)"  dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

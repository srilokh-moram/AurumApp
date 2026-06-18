interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: "default" | "green" | "red" | "gold";
  icon?: React.ReactNode;
}

const colorMap = {
  default: "text-white",
  green: "text-emerald-400",
  red: "text-red-400",
  gold: "text-gold-400",
};

export default function StatCard({ label, value, sub, color = "default", icon }: StatCardProps) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</span>
        {icon && <span className="text-gray-600">{icon}</span>}
      </div>
      <div>
        <span className={`text-lg sm:text-2xl font-bold font-mono ${colorMap[color]}`}>{value}</span>
        {sub && <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

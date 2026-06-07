"use client";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

export default function Slider({ label, value, min, max, step = 1, onChange }: SliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: "var(--accent)" }}
      />
      <div className="flex justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

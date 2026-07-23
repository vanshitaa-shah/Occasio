import { SHAPE_COLORS } from '../../lib/shapes';

interface SwatchesProps {
  value: string;
  onChange: (color: string) => void;
}

/** Row of color swatches with the active one ringed. */
export function Swatches({ value, onChange }: SwatchesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SHAPE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`color ${c}`}
          onClick={() => onChange(c)}
          className={`h-7 w-7 rounded-full border transition ${
            value.toLowerCase() === c.toLowerCase()
              ? 'ring-2 ring-blue-400 ring-offset-1'
              : 'border-slate-200'
          }`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

import React from 'react';

export function BarChart({ data, height = 120 }) {
  // data: [{ label, value, color? }]
  if (!data || data.length === 0) return <div className="text-text-muted text-xs py-4 text-center">No statistics available</div>;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((item, i) => {
        const barHeight = (item.value / max) * (height - 28);
        return (
          <div key={i} className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <span className="text-[9px] font-mono font-bold text-text-secondary">
              {typeof item.value === 'number' && item.value % 1 !== 0
                ? item.value.toFixed(1)
                : item.value}
            </span>
            <div
              className="w-full rounded-t-lg transition-all duration-300 bg-black dark:bg-white"
              style={{
                height: Math.max(barHeight, 3),
                minWidth: 12,
                maxWidth: 32,
              }}
            />
            <span className="text-[9px] font-bold text-text-muted truncate max-w-full uppercase tracking-wider">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function LineChart({ data, height = 120, width = '100%' }) {
  // data: [{ label, value }]
  if (!data || data.length < 2) return <div className="text-text-muted text-xs py-4 text-center">Awaiting historical data...</div>;

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = 0;
  const range = max - min || 1;
  const svgWidth = 400;
  const svgHeight = height;
  const padX = 24;
  const padY = 16;
  const plotW = svgWidth - padX * 2;
  const plotH = svgHeight - padY * 2;

  const points = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * plotW,
    y: padY + plotH - ((d.value - min) / range) * plotH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padY + plotH} L ${points[0].x} ${padY + plotH} Z`;

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width, height }} className="overflow-visible select-none">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((pct) => {
        const y = padY + plotH - (pct / 100) * plotH;
        return (
          <g key={pct}>
            <line x1={padX} y1={y} x2={svgWidth - padX} y2={y} stroke="var(--divider)" strokeWidth="0.75" strokeDasharray="3 3" />
            <text x={padX - 6} y={y + 3} textAnchor="end" fontSize="8" fontWeight="bold" fill="var(--text-muted)" fontFamily="var(--font-mono)">
              {Math.round(min + (pct / 100) * range)}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill="var(--text-primary)" opacity="0.03" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="var(--surface)" stroke="var(--text-primary)" strokeWidth="2" />
          <title>{data[i].label}: {data[i].value}</title>
        </g>
      ))}
    </svg>
  );
}

export function CalendarGrid({ year, month, history, onDayClick }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getStyle = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = history.find((h) => h.date === dateStr);
    
    if (!entry) return { backgroundColor: 'transparent', color: 'var(--text-secondary)' };
    
    const score = entry.score || 0;
    if (score >= 80) return { backgroundColor: 'var(--text-primary)', color: 'var(--surface)' };
    if (score >= 60) return { backgroundColor: 'var(--border-hover)', color: 'var(--text-primary)' };
    if (score >= 40) return { backgroundColor: 'var(--divider)', color: 'var(--text-secondary)' };
    
    return { 
      backgroundColor: 'var(--surface)', 
      color: 'var(--text-muted)', 
      border: '1px dashed var(--border-hover)' 
    };
  };

  return (
    <div>
      <h4 className="text-xs font-extrabold uppercase tracking-widest text-text-primary mb-4">{monthName}</h4>
      <div className="grid grid-cols-7 gap-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-[10px] text-text-muted text-center font-bold py-1 select-none">{d}</div>
        ))}
        {cells.map((day, i) => {
          const style = day ? getStyle(day) : {};
          return (
            <div
              key={i}
              onClick={() => day && onDayClick && onDayClick(day)}
              className={`text-xs text-center py-2.5 rounded-lg transition-all duration-150 font-semibold select-none
                ${day ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
              style={day ? style : {}}
            >
              {day || ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

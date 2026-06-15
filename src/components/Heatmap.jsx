import React from 'react';

export default function Heatmap({ history, days = 90 }) {
  // Generate last N days
  const cells = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const entry = history.find((h) => h.date === key);
    cells.push({ date: key, score: entry?.score ?? null, day: d });
  }

  const getColor = (score) => {
    if (score === null) return 'var(--divider)';
    if (score >= 80) return 'var(--text-primary)'; // solid black / white
    if (score >= 60) return 'var(--text-secondary)'; // dark grey
    if (score >= 40) return 'var(--border-hover)'; // medium grey
    if (score >= 20) return 'var(--border)'; // light grey
    return 'var(--chip-bg)'; // very light grey
  };

  // Arrange into weeks (columns) for GitHub-style layout
  const weeks = [];
  let currentWeek = [];
  // Pad first week
  const firstDay = cells[0]?.day.getDay() || 0;
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push(null);
  }
  cells.forEach((cell) => {
    currentWeek.push(cell);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell, ci) => (
              <div
                key={ci}
                className="heatmap-cell relative group"
                style={{
                  backgroundColor: cell ? getColor(cell.score) : 'transparent',
                }}
              >
                {cell && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-black text-white text-[10px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-md">
                    {cell.date} · {cell.score !== null ? `${cell.score} pts` : 'No log'}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 select-none">
        <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Less</span>
        {['var(--divider)', 'var(--chip-bg)', 'var(--border)', 'var(--border-hover)', 'var(--text-secondary)', 'var(--text-primary)'].map((c, i) => (
          <div key={i} className="w-[11px] h-[11px] rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">More</span>
      </div>
    </div>
  );
}

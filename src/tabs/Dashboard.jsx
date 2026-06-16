import React, { useState, useMemo } from 'react';
import { Clock, CheckCircle2, AlertCircle, Plus, X, Droplets, Pill, Sparkles, Sun, ArrowRight, Play } from 'lucide-react';
import { Card, CardLabel, SectionLabel, Checkbox, ProgressBar, Button, Input, Select, Chip, Divider, StatNumber } from '../components/UI';
import Modal from '../components/Modal';
import { useClock } from '../hooks/useClock';
import { formatTime, formatDate, getScoreColor, getScoreLabel, isTimePast, generateId } from '../lib/utils';
import { calculateDailyScore } from '../lib/score';
import { KEYS, loadData } from '../lib/storage';

export default function Dashboard({ todayData, setTodayData, profile, setActiveTab, timer }) {
  const now = useClock();
  const [showBriefing, setShowBriefing] = useState(() => now.getHours() < 9);
  const [noteModal, setNoteModal] = useState(null); // block index
  const [noteText, setNoteText] = useState('');
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [newReminder, setNewReminder] = useState({ label: '', time: '09:00', repeat: 'daily' });

  const scoreResult = useMemo(() => calculateDailyScore(todayData, profile), [todayData, profile]);
  const score = scoreResult.score;
  const totalBlocks = todayData.schedule?.length || 0;
  const completedBlocks = todayData.schedule?.filter((b) => b.completed).length || 0;
  const remainingBlocks = totalBlocks - completedBlocks;

  const scheduleProgress = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;

  // Load history for charts
  const rawHistory = loadData(KEYS.HISTORY) || [];
  const history = useMemo(() => {
    // Return last 7 days. If empty, return placeholder values for a beautiful first load graph
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (rawHistory.length === 0) {
      return days.map((day, idx) => ({
        label: day,
        value: [65, 80, 55, 90, 75, 95, score || 70][idx],
      }));
    }
    // Take last 7 records and reverse to chronological
    const recent = rawHistory.slice(0, 6).reverse();
    recent.push({ date: 'Today', score: score });
    return recent.map((h, i) => {
      const d = new Date(h.date + 'T12:00:00');
      const label = h.date === 'Today' ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        label,
        value: h.score || h.value || 0,
      };
    });
  }, [rawHistory, score]);

  // Find next/active block
  const activeBlock = useMemo(() => {
    if (!todayData.schedule || todayData.schedule.length === 0) return null;
    return todayData.schedule.find((b) => !b.completed) || todayData.schedule[todayData.schedule.length - 1];
  }, [todayData.schedule]);

  const handleBlockCheck = (index, checked) => {
    if (checked && !todayData.schedule[index].completed) {
      const cat = todayData.schedule[index].category;
      if (['deep-work', 'learning', 'admin'].includes(cat)) {
        setNoteModal(index);
        setNoteText('');
      }
    }
    setTodayData((prev) => {
      const schedule = [...prev.schedule];
      schedule[index] = { ...schedule[index], completed: checked };
      return { ...prev, schedule };
    });
  };

  const saveNote = () => {
    if (noteModal !== null) {
      setTodayData((prev) => {
        const schedule = [...prev.schedule];
        schedule[noteModal] = { ...schedule[noteModal], note: noteText };
        return { ...prev, schedule };
      });
      setNoteModal(null);
    }
  };

  const handleHabitCheck = (habit, checked) => {
    setTodayData((prev) => ({
      ...prev,
      habits: { ...prev.habits, [habit]: checked },
    }));
  };

  const handleReminderCheck = (index, checked) => {
    setTodayData((prev) => {
      const reminders = [...prev.reminders];
      reminders[index] = { ...reminders[index], completed: checked };
      return { ...prev, reminders };
    });
  };

  const addCustomReminder = () => {
    if (!newReminder.label.trim()) return;
    setTodayData((prev) => ({
      ...prev,
      customReminders: [...(prev.customReminders || []), { ...newReminder, id: generateId(), completed: false }],
    }));
    setNewReminder({ label: '', time: '09:00', repeat: 'daily' });
    setShowReminderForm(false);
  };

  const removeCustomReminder = (id) => {
    setTodayData((prev) => ({
      ...prev,
      customReminders: (prev.customReminders || []).filter((r) => r.id !== id),
    }));
  };

  // Generate Bezier path points for the statistics curved line
  const svgWidth = 320;
  const svgHeight = 120;
  const padX = 24;
  const padY = 20;
  const plotW = svgWidth - padX * 2;
  const plotH = svgHeight - padY * 2;

  const points = useMemo(() => {
    if (history.length < 2) return [];
    const maxVal = 100;
    const minVal = 0;
    const range = maxVal - minVal;
    return history.map((d, i) => ({
      x: padX + (i / (history.length - 1)) * plotW,
      y: padY + plotH - ((d.value - minVal) / range) * plotH,
    }));
  }, [history, plotW, plotH, padX, padY]);

  // Generate cubic bezier path string
  const bezierPath = useMemo(() => {
    if (points.length < 2) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return path;
  }, [points]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT MAIN COLUMN: Greeting Banner, Ongoing Card, Checklist */}
      <div className="lg:col-span-8 space-y-8">
        
        {/* Hello Greeting Banner */}
        <div className="bg-[#FFFFFF] border border-border rounded-card p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-soft relative overflow-hidden">
          <div className="space-y-3 z-10 flex-1">
            <span className="text-xs font-bold text-text-muted tracking-widest uppercase">Overview</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-text-primary">
              Hello {profile.name || 'Champion'}!
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed max-w-sm">
              It's good to see you again. Your productivity score stands at <span className="font-bold text-black">{score} points</span>. Keep the momentum going!
            </p>
          </div>

          {/* Waving Character SVG */}
          <div className="z-10 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-2 shrink-0">
            <svg viewBox="0 0 120 120" className="w-24 h-24 text-black dark:text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M45,25 C35,20 30,30 30,35 C30,45 35,48 40,48" fill="currentColor" opacity="0.05" />
              <path d="M40,24 C48,12 65,12 75,20 C82,26 82,35 78,42" fill="currentColor" opacity="0.1" stroke="currentColor" />
              <path d="M40,45 C38,55 38,70 50,75 C62,78 74,70 74,55 C74,45 74,40 70,35" />
              <circle cx="48" cy="48" r="8" />
              <circle cx="66" cy="48" r="8" />
              <line x1="56" y1="48" x2="58" y2="48" />
              <line x1="40" y1="46" x2="35" y2="44" />
              <line x1="74" y1="46" x2="78" y2="44" />
              <circle cx="48" cy="48" r="2.5" fill="currentColor" />
              <circle cx="66" cy="48" r="2.5" fill="currentColor" />
              <path d="M52,60 C55,64 61,64 64,60" />
              <path d="M50,75 L50,85 M64,75 L64,85" />
              <path d="M35,90 C40,86 50,85 57,85 C64,85 74,86 79,90 C84,94 85,105 85,115 L29,115 C29,105 30,94 35,90 Z" fill="currentColor" />
              <path d="M29,95 C25,85 20,70 25,60" />
              <path d="M25,60 C23,55 21,50 23,45 C24,42 27,42 28,45 L28,52 M28,45 C29,40 32,40 33,43 L33,52 M33,43 C34,39 37,39 38,42 L38,52 M38,45 C39,43 41,43 42,46 L42,55 M24,60 C27,61 31,62 33,60 C36,58 37,55 35,53" />
            </svg>
          </div>
        </div>

        {/* Current Active/Upcoming Focus Block */}
        {activeBlock && (
          <div className="bg-[#FFFFFF] border border-border rounded-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center font-mono font-bold text-xs select-none">
                {activeBlock.time}
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-muted tracking-widest uppercase">UPCOMING BLOCK</span>
                <h3 className="text-base font-bold text-text-primary mt-0.5">{activeBlock.label}</h3>
                <p className="text-xs text-text-secondary mt-0.5">Category: {activeBlock.category}</p>
              </div>
            </div>
            <Button 
              variant="primary" 
              size="sm" 
              className="w-full sm:w-auto self-stretch sm:self-center"
              onClick={() => setActiveTab && setActiveTab('timer')}
            >
              Continue Focus <ArrowRight size={14} />
            </Button>
          </div>
        )}

        {/* Schedule Checklist Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Today's Schedule</SectionLabel>
            <Chip>{completedBlocks} / {totalBlocks} Blocks Done</Chip>
          </div>
          <div className="space-y-3">
            {(todayData.schedule || []).map((block, i) => (
              <Card key={block.id || i} interactive className="!py-4 hover:border-black">
                <div className="flex items-center justify-between gap-4 w-full">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Checkbox
                      checked={block.completed}
                      onChange={(checked) => handleBlockCheck(i, checked)}
                    />
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="font-mono text-xs text-text-muted shrink-0">{block.time}</span>
                      <span className={`text-[13px] font-bold truncate ${block.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                        {block.label}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action items on the right */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Chip variant="default" className="text-[10px] py-1 border border-border uppercase tracking-wide">
                      {block.category}
                    </Chip>
                    {block.note && (
                      <div className="hidden sm:block text-[10px] text-text-muted italic max-w-[120px] truncate">
                        "{block.note}"
                      </div>
                    )}
                    {isTimePast(block.time) && !block.completed && (
                      <AlertCircle size={14} className="text-neutral-500 shrink-0" />
                    )}
                    {block.completed ? (
                      <span className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] text-neutral-800 font-bold select-none">✓</span>
                    ) : (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="py-1 px-3 text-[11px] font-bold hover:bg-black hover:text-white"
                        onClick={() => handleBlockCheck(i, true)}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT SIDE COLUMN: Stats Grid, Graph, Focus Brain, Reminders */}
      <div className="lg:col-span-4 space-y-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="text-center py-5">
            <CardLabel>Score Today</CardLabel>
            <div className="mt-2 flex items-baseline justify-center gap-0.5">
              <span className="text-3xl font-extrabold tracking-tight" style={{ color: getScoreColor(score) }}>{score}</span>
              <span className="text-xs text-text-muted">/100</span>
            </div>
            <div className="text-[10px] font-semibold text-text-secondary mt-1">{getScoreLabel(score)}</div>
          </Card>

          <Card className="text-center py-5">
            <CardLabel>Schedule Progress</CardLabel>
            <div className="mt-2 text-3xl font-extrabold tracking-tight">{scheduleProgress}%</div>
            <div className="text-[10px] font-semibold text-text-secondary mt-1">{remainingBlocks} left</div>
          </Card>
        </div>

        {/* Curved Statistics SVG Line Graph */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardLabel>Your statistics</CardLabel>
            <Chip className="text-[9px] uppercase font-bold tracking-wider">Weekly</Chip>
          </div>
          
          {points.length >= 2 ? (
            <div className="relative">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
                {/* Horizontal gridlines */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = padY + plotH - (val / 100) * plotH;
                  return (
                    <line
                      key={val}
                      x1={padX}
                      y1={y}
                      x2={svgWidth - padX}
                      y2={y}
                      stroke="var(--divider)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Drop shadow on the path */}
                <path
                  d={bezierPath}
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.05)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />

                {/* Main Curved Bezier Line */}
                <path
                  d={bezierPath}
                  fill="none"
                  stroke="var(--text-primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Point markers */}
                {points.map((p, idx) => (
                  <g key={idx} className="group cursor-pointer">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      fill="var(--surface)"
                      stroke="var(--text-primary)"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="8"
                      fill="var(--text-primary)"
                      opacity="0"
                      className="hover:opacity-10 transition-opacity"
                    />
                    <title>{history[idx].label}: {history[idx].value} pts</title>
                  </g>
                ))}
              </svg>

              {/* X Axis Labels */}
              <div className="flex justify-between px-3 mt-2 text-[10px] font-bold text-text-muted">
                {history.map((h, i) => (
                  <span key={i} className="w-8 text-center">{h.label}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-xs text-text-muted">
              Not enough data to map statistics
            </div>
          )}
        </Card>

        {/* Learn Even More! Brain Box */}
        <Card className="relative overflow-hidden bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
          <div className="flex items-start gap-4 z-10 relative">
            {/* Brain Illustration SVG */}
            <div className="shrink-0 p-2 bg-white dark:bg-black rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
              <svg viewBox="0 0 100 100" className="w-16 h-16 text-black dark:text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15,80 C30,75 50,75 50,85 C50,75 70,75 85,80 L85,45 C70,40 50,40 50,50 C50,40 30,40 15,45 Z" />
                <line x1="50" y1="50" x2="50" y2="85" />
                <path d="M50,45 C42,45 35,41 35,32 C35,22 45,20 45,26 C43,18 50,15 50,22" />
                <path d="M42,35 C38,32 38,28 42,26" />
                <path d="M50,45 C58,45 65,41 65,32 C65,22 55,20 55,26 C57,18 50,15 50,22" />
                <path d="M58,35 C62,32 62,28 58,26" />
                <line x1="50" y1="10" x2="50" y2="6" />
                <line x1="28" y1="20" x2="24" y2="17" />
                <line x1="72" y1="20" x2="76" y2="17" />
                <line x1="22" y1="35" x2="17" y2="35" />
                <line x1="78" y1="35" x2="83" y2="35" />
              </svg>
            </div>
            
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-bold text-text-primary">Log focused work</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Log completed work sessions or Pomodoro blocks to raise your score.
              </p>
              <Button 
                variant="primary" 
                size="sm" 
                className="py-2 px-4 text-xs font-bold w-full bg-black text-white hover:bg-neutral-800"
                onClick={() => {
                  if (timer) {
                    if (!timer.pomodoroMode) {
                      timer.togglePomodoro();
                    }
                    timer.play();
                  }
                  if (setActiveTab) {
                    setActiveTab('timer');
                  }
                }}
              >
                Start Pomodoro
              </Button>
            </div>
          </div>
        </Card>

        {/* Reminders & Habits Panel */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Reminders & Habits</SectionLabel>
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={() => setShowReminderForm(true)}>
              <Plus size={16} />
            </Button>
          </div>
          
          <div className="space-y-2">
            {/* Habits list */}
            <Card className="!py-3 !px-4">
              <div className="flex items-center justify-between gap-3">
                <Checkbox
                  checked={todayData.habits?.grooming || false}
                  onChange={(c) => handleHabitCheck('grooming', c)}
                  label="Morning Grooming"
                />
                {isTimePast('08:00') && !todayData.habits?.grooming && (
                  <Chip variant="alert" className="text-[9px] py-0.5">Overdue</Chip>
                )}
              </div>
            </Card>

            <Card className="!py-3 !px-4">
              <div className="flex items-center justify-between gap-3">
                <Checkbox
                  checked={todayData.habits?.medicine || false}
                  onChange={(c) => handleHabitCheck('medicine', c)}
                  label="Take Medicine"
                />
                {isTimePast('09:00') && !todayData.habits?.medicine && (
                  <Chip variant="alert" className="text-[9px] py-0.5">Overdue</Chip>
                )}
              </div>
            </Card>

            {/* Hydration glass tracker */}
            <Card className="!py-3 !px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Droplets size={16} className="text-text-secondary" />
                  <span className="text-[13px] font-bold">Hydration Tracker</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold">{todayData.hydration || 0}/{profile?.hydrationGoal || 8} glass</span>
                  <button
                    onClick={() => setTodayData((prev) => ({ ...prev, hydration: (prev.hydration || 0) + 1 }))}
                    className="w-6 h-6 rounded-lg bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 text-xs font-extrabold select-none"
                  >
                    +
                  </button>
                </div>
              </div>
            </Card>

            {/* Custom reminders */}
            {(todayData.customReminders || []).map((reminder) => (
              <Card key={reminder.id} className="!py-3 !px-4">
                <div className="flex items-center justify-between gap-3">
                  <Checkbox
                    checked={reminder.completed}
                    onChange={(c) => {
                      setTodayData((prev) => ({
                        ...prev,
                        customReminders: prev.customReminders.map((r) =>
                          r.id === reminder.id ? { ...r, completed: c } : r
                        ),
                      }));
                    }}
                    label={`${reminder.label} (${reminder.time})`}
                  />
                  <button onClick={() => removeCustomReminder(reminder.id)} className="text-text-muted hover:text-red-500">
                    <X size={12} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>

      {/* Note Modal */}
      <Modal isOpen={noteModal !== null} onClose={() => setNoteModal(null)} title="What did you work on?">
        <div className="space-y-3">
          <Input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g. Completed Chemistry Chapter 3, Drafted presentation..."
            autoFocus
          />
          <div className="flex gap-2">
            <Button onClick={saveNote}>Save Note</Button>
            <Button variant="secondary" onClick={() => setNoteModal(null)}>Skip</Button>
          </div>
        </div>
      </Modal>

      {/* Add Reminder Modal */}
      <Modal isOpen={showReminderForm} onClose={() => setShowReminderForm(false)} title="Add Reminder">
        <div className="space-y-3">
          <div>
            <CardLabel>Label</CardLabel>
            <Input
              value={newReminder.label}
              onChange={(e) => setNewReminder((r) => ({ ...r, label: e.target.value }))}
              placeholder="e.g. Stretch, Call family..."
              className="mt-1"
            />
          </div>
          <div>
            <CardLabel>Time</CardLabel>
            <Input
              type="time"
              value={newReminder.time}
              onChange={(e) => setNewReminder((r) => ({ ...r, time: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <CardLabel>Repeat</CardLabel>
            <Select
              value={newReminder.repeat}
              onChange={(e) => setNewReminder((r) => ({ ...r, repeat: e.target.value }))}
              className="mt-1 w-full"
            >
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="once">One-time</option>
            </Select>
          </div>
          <Button onClick={addCustomReminder} className="w-full">Add Reminder</Button>
        </div>
      </Modal>

      {/* Score Breakdown breakdown details */}
      <div className="col-span-1 lg:col-span-12">
        <Card>
          <CardLabel>Score Breakdown</CardLabel>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mt-4">
            {Object.entries(scoreResult.breakdown).map(([key, val]) => (
              <div key={key} className="space-y-1">
                <span className="text-[11px] font-bold text-text-secondary capitalize block">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className={`font-mono text-lg font-extrabold ${val < 0 ? 'text-neutral-400' : val > 0 ? 'text-black dark:text-white' : 'text-text-muted'}`}>
                  {val > 0 ? '+' : ''}{val}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { Play, Pause, RotateCcw, Clock, Zap, Coffee, Target, FileText, Tag } from 'lucide-react';
import { Card, CardLabel, SectionLabel, Button, Input, Select, Chip, Divider, ProgressBar } from '../components/UI';
import Modal from '../components/Modal';
import { BarChart } from '../components/Charts';
import { formatTimerDisplay, formatDuration, getDateKey, getWeekDates } from '../lib/utils';
import { KEYS, loadData } from '../lib/storage';

export default function TimerTab({ timer, todayData, setTodayData, profile, projects, setProjects }) {
  const [showReport, setShowReport] = useState(false);

  const {
    isRunning, elapsed, gaps, sessions, currentProject, setCurrentProject,
    pomodoroMode, pomodoroPhase, pomodoroElapsed, pomodoroCycles,
    play, pause, reset, togglePomodoro, todayWorkSeconds, todayBreakSeconds,
    WORK_DURATION, BREAK_DURATION,
  } = timer;

  // Weekly work hours
  const weekDates = getWeekDates();
  const history = loadData(KEYS.HISTORY) || [];
  const weekWorkMinutes = weekDates.reduce((sum, date) => {
    if (date === getDateKey()) return sum + (todayData.workMinutes || 0);
    const day = history.find((h) => h.date === date);
    return sum + (day?.workMinutes || 0);
  }, 0);
  const weeklyTarget = (profile?.weeklyWorkHourGoal || 50) * 60;
  const weeklyHours = (weekWorkMinutes / 60).toFixed(1);

  // Project time summary for today
  const projectSummary = useMemo(() => {
    const map = {};
    [...sessions, ...(todayData.sessions || [])].forEach((s) => {
      const proj = s.project || 'Untagged';
      map[proj] = (map[proj] || 0) + (s.durationMinutes || s.durationSeconds / 60 || 0);
    });
    if (isRunning && currentProject) {
      map[currentProject] = (map[currentProject] || 0) + elapsed / 60;
    }
    return Object.entries(map).map(([label, value]) => ({
      label,
      value: Math.round(value * 10) / 10,
      color: 'var(--text-primary)',
    }));
  }, [sessions, todayData.sessions, isRunning, elapsed, currentProject]);

  // Add project
  const addProject = (name) => {
    if (name && !(projects || []).includes(name)) {
      setProjects((prev) => [...(prev || []), name]);
    }
  };

  // Pomodoro progress
  const pomodoroTarget = pomodoroPhase === 'work' ? WORK_DURATION : BREAK_DURATION;

  // Time report
  const allSessions = [...(todayData.sessions || []), ...sessions];
  const totalWorkSec = todayWorkSeconds;
  const totalBreakSec = todayBreakSeconds;
  const allGaps = [
    ...gaps,
    ...allSessions.flatMap((s) => s.gaps || []),
  ];
  const longestSession = allSessions.reduce((max, s) => Math.max(max, s.durationSeconds || 0), elapsed);
  const firstStart = allSessions.length > 0 ? allSessions[0].startTime : null;
  const lastEnd = allSessions.length > 0 ? allSessions[allSessions.length - 1].endTime : null;
  const activeWindowSec = firstStart && lastEnd ? (new Date(lastEnd) - new Date(firstStart)) / 1000 : totalWorkSec;
  const efficiency = activeWindowSec > 0 ? Math.round((totalWorkSec / activeWindowSec) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Main Timer Display */}
      <Card className="text-center py-10 flex flex-col items-center justify-center relative overflow-hidden">
        {pomodoroMode && (
          <div className="mb-4">
            <Chip variant={pomodoroPhase === 'work' ? 'success' : 'default'} className="uppercase font-bold tracking-wider text-[10px]">
              {pomodoroPhase === 'work' ? '🎯 Focus Session' : '☕ Rest Break'} · Cycle {pomodoroCycles + 1}
            </Chip>
          </div>
        )}
        
        <CardLabel>TIMER ELAPSED</CardLabel>
        <div className="timer-display mt-4 font-mono select-all">
          {formatTimerDisplay(pomodoroMode ? pomodoroElapsed : elapsed)}
        </div>
        
        {pomodoroMode && (
          <ProgressBar
            value={pomodoroElapsed}
            max={pomodoroTarget}
            color="bg-black dark:bg-white"
            className="w-full max-w-sm mt-6"
          />
        )}

        <div className="flex items-center gap-6 mt-8">
          {!isRunning ? (
            <button
              onClick={play}
              className="w-16 h-16 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <Play size={24} className="ml-1 fill-current" />
            </button>
          ) : (
            <button
              onClick={pause}
              className="w-16 h-16 rounded-full border border-neutral-300 hover:border-black flex items-center justify-center shadow-md bg-white text-black transition-transform hover:scale-105 active:scale-95"
            >
              <Pause size={24} />
            </button>
          )}
          
          <Button 
            variant="secondary" 
            size="icon" 
            className="w-12 h-12 rounded-full hover:bg-black hover:text-white"
            onClick={reset}
          >
            <RotateCcw size={16} />
          </Button>
        </div>
      </Card>

      {/* Project Tag + Pomodoro Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardLabel>Project Tagging</CardLabel>
          <div className="flex items-center gap-3 mt-3">
            <Tag size={16} className="text-text-muted shrink-0" />
            <Select
              value={currentProject}
              onChange={(e) => {
                setCurrentProject(e.target.value);
                addProject(e.target.value);
              }}
              className="flex-1"
            >
              <option value="">Select project...</option>
              {(projects || []).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
            <Input
              placeholder="Add Tag"
              className="w-32"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value) {
                  addProject(e.target.value);
                  setCurrentProject(e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </Card>

        <Card className="p-6">
          <CardLabel>Pomodoro Timer Mode</CardLabel>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-text-primary">Use standard 25/5 cycles</span>
              {pomodoroMode && (
                <Chip variant="default" className="text-[10px] uppercase font-bold">{pomodoroCycles} Cycles today</Chip>
              )}
            </div>
            <button
              onClick={togglePomodoro}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 outline-none
                ${pomodoroMode ? 'bg-black dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-800'}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white dark:bg-black transition-transform duration-200
                ${pomodoroMode ? 'translate-x-6' : 'translate-x-1'}`} 
              />
            </button>
          </div>
        </Card>
      </div>

      {/* Today's Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="py-5 text-center">
          <CardLabel>Focused Hours</CardLabel>
          <div className="text-2xl font-extrabold mt-2 font-mono">{formatDuration(totalWorkSec / 60)}</div>
        </Card>
        <Card className="py-5 text-center">
          <CardLabel>Break Hours</CardLabel>
          <div className="text-2xl font-extrabold mt-2 text-text-secondary font-mono">{formatDuration(totalBreakSec / 60)}</div>
        </Card>
        <Card className="py-5 text-center">
          <CardLabel>Sessions Done</CardLabel>
          <div className="text-2xl font-extrabold mt-2 font-mono">{allSessions.length + (isRunning ? 1 : 0)}</div>
        </Card>
        <Card className="py-5 text-center">
          <CardLabel>Efficiency Rate</CardLabel>
          <div className="text-2xl font-extrabold mt-2 font-mono text-black dark:text-white">
            {efficiency}%
          </div>
        </Card>
      </div>

      {/* Weekly Progress Tracker */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <CardLabel>Weekly Work Target</CardLabel>
          <span className="text-xs font-mono font-bold">{weeklyHours} / {profile?.weeklyWorkHourGoal || 50} Hours</span>
        </div>
        <ProgressBar value={weekWorkMinutes} max={weeklyTarget} />
      </Card>

      {/* Gap Tracker warning panel */}
      {gaps.length > 0 && (
        <Card className="p-6">
          <CardLabel>Gap Analysis (Wasted blocks)</CardLabel>
          <div className="space-y-2 mt-3">
            {gaps.map((gap, i) => {
              const mins = gap.duration / 60;
              return (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-divider last:border-none">
                  <span className="text-text-secondary">Unaccounted gap #{i + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono">{formatDuration(mins)}</span>
                    {mins > 30 && <Chip variant="alert" className="text-[9px] py-0.5">Long Gap</Chip>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Project distribution bar charts */}
      {projectSummary.length > 0 && (
        <Card className="p-6">
          <CardLabel>Time Distribution by Project</CardLabel>
          <div className="mt-6">
            <BarChart data={projectSummary} height={120} />
          </div>
        </Card>
      )}

      {/* Logged Sessions list */}
      {allSessions.length > 0 && (
        <div>
          <SectionLabel>Today's Focus Log</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allSessions.map((session, i) => (
              <Card key={i} className="!py-4 flex justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center font-mono font-bold text-xs select-none">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{formatDuration(session.durationMinutes || session.durationSeconds / 60)}</h4>
                    <span className="text-[10px] text-text-muted">
                      {session.startTime ? new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} - {session.endTime ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
                {session.project && <Chip variant="default" className="text-[10px]">{session.project}</Chip>}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Generate Time Report CTA */}
      <Button onClick={() => setShowReport(true)} variant="secondary" className="w-full py-4 text-xs font-bold hover:bg-black hover:text-white">
        <FileText size={14} /> Generate Complete Time Report
      </Button>

      {/* Time Report Detail Modal */}
      <Modal isOpen={showReport} onClose={() => setShowReport(false)} title="Time Analysis Report" maxWidth="max-w-lg">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="border-r border-divider pr-4">
              <CardLabel>Total Focus</CardLabel>
              <div className="font-mono text-xl font-bold mt-1">{formatDuration(totalWorkSec / 60)}</div>
            </div>
            <div className="pl-2">
              <CardLabel>Total Breaks</CardLabel>
              <div className="font-mono text-xl font-bold mt-1 text-text-secondary">{formatDuration(totalBreakSec / 60)}</div>
            </div>
            <div className="border-r border-divider pr-4">
              <CardLabel>Longest Focus</CardLabel>
              <div className="font-mono text-xl font-bold mt-1">{formatDuration(longestSession / 60)}</div>
            </div>
            <div className="pl-2">
              <CardLabel>Focus Efficiency</CardLabel>
              <div className="font-mono text-xl font-bold mt-1">{efficiency}%</div>
            </div>
          </div>

          {allGaps.length > 0 && (
            <>
              <Divider />
              <CardLabel>Gaps Recorded</CardLabel>
              <div className="space-y-1.5 mt-2">
                {allGaps.map((gap, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-divider last:border-none">
                    <span className="text-text-secondary">Unfocused Break #{i + 1}</span>
                    <span className="font-mono font-bold">{formatDuration(gap.duration / 60)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {projectSummary.length > 0 && (
            <>
              <Divider />
              <CardLabel>Project Hours</CardLabel>
              <div className="space-y-2 mt-2">
                {projectSummary.map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="font-semibold">{p.label}</span>
                    <span className="font-mono font-bold">{formatDuration(p.value * 60)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          
          <Button onClick={() => setShowReport(false)} className="w-full mt-4 bg-black text-white hover:bg-neutral-800">Close Report</Button>
        </div>
      </Modal>
    </div>
  );
}

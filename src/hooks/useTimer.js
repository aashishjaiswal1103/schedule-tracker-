import { useState, useEffect, useRef, useCallback } from 'react';
import { playChime } from '../lib/utils';

export function useTimer(onSessionEnd, profile) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [gaps, setGaps] = useState([]); // { start, end, duration }
  const [sessions, setSessions] = useState([]); // completed sessions today
  const [currentProject, setCurrentProject] = useState('');
  const [sessionStart, setSessionStart] = useState(null);
  const [pauseStart, setPauseStart] = useState(null);
  
  // Pomodoro
  const [pomodoroMode, setPomodoroMode] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState('work'); // work | break
  const [pomodoroElapsed, setPomodoroElapsed] = useState(0);
  const [pomodoroCycles, setPomodoroCycles] = useState(0);
  
  const WORK_DURATION = (profile?.pomodoroWorkMinutes || 25) * 60;
  const BREAK_DURATION = (profile?.pomodoroBreakMinutes || 5) * 60;

  const intervalRef = useRef(null);

  // Load persisted timer state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('accountability_timer');
      if (saved) {
        const state = JSON.parse(saved);
        setElapsed(state.elapsed || 0);
        setGaps(state.gaps || []);
        setSessions(state.sessions || []);
        setCurrentProject(state.currentProject || '');
        setPomodoroMode(state.pomodoroMode || false);
        setPomodoroPhase(state.pomodoroPhase || 'work');
        setPomodoroElapsed(state.pomodoroElapsed || 0);
        setPomodoroCycles(state.pomodoroCycles || 0);
        // Don't auto-resume — user must press play
      }
    } catch { /* ignore */ }
  }, []);

  // Persist timer state
  useEffect(() => {
    const state = {
      elapsed, gaps, sessions, currentProject,
      pomodoroMode, pomodoroPhase, pomodoroElapsed, pomodoroCycles,
      isRunning,
    };
    localStorage.setItem('accountability_timer', JSON.stringify(state));
  }, [elapsed, gaps, sessions, currentProject, pomodoroMode, pomodoroPhase, pomodoroElapsed, pomodoroCycles, isRunning]);

  // Main tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
        if (pomodoroMode) {
          setPomodoroElapsed((pe) => pe + 1);
        }
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, pomodoroMode]);

  // Pomodoro phase transitions
  useEffect(() => {
    if (!pomodoroMode || !isRunning) return;
    const target = pomodoroPhase === 'work' ? WORK_DURATION : BREAK_DURATION;
    if (pomodoroElapsed >= target) {
      playChime(pomodoroPhase === 'work' ? 'break' : 'work');
      if (pomodoroPhase === 'work') {
        setPomodoroPhase('break');
        setPomodoroCycles((c) => c + 1);
      } else {
        setPomodoroPhase('work');
      }
      setPomodoroElapsed(0);
    }
  }, [pomodoroElapsed, pomodoroPhase, pomodoroMode, isRunning, WORK_DURATION, BREAK_DURATION]);

  const play = useCallback(() => {
    if (!isRunning) {
      // If resuming from pause, log the gap
      if (pauseStart) {
        const gapDuration = (Date.now() - pauseStart) / 1000;
        setGaps((prev) => [...prev, {
          start: new Date(pauseStart).toISOString(),
          end: new Date().toISOString(),
          duration: gapDuration,
        }]);
        setPauseStart(null);
      }
      if (!sessionStart) {
        setSessionStart(new Date().toISOString());
      }
      setIsRunning(true);
    }
  }, [isRunning, pauseStart, sessionStart]);

  const pause = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
      setPauseStart(Date.now());
    }
  }, [isRunning]);

  const reset = useCallback(() => {
    // End current session
    if (sessionStart && elapsed > 0) {
      const session = {
        project: currentProject,
        startTime: sessionStart,
        endTime: new Date().toISOString(),
        durationSeconds: elapsed,
        durationMinutes: Math.round(elapsed / 60 * 10) / 10,
        gaps: [...gaps],
        date: new Date().toISOString().split('T')[0],
      };
      setSessions((prev) => [...prev, session]);
      if (onSessionEnd) onSessionEnd(session);
    }
    setIsRunning(false);
    setElapsed(0);
    setGaps([]);
    setSessionStart(null);
    setPauseStart(null);
    setPomodoroElapsed(0);
    setPomodoroPhase('work');
  }, [sessionStart, elapsed, currentProject, gaps, onSessionEnd]);

  const togglePomodoro = useCallback(() => {
    setPomodoroMode((prev) => !prev);
    setPomodoroElapsed(0);
    setPomodoroPhase('work');
  }, []);

  const todayWorkSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) + (isRunning ? elapsed : 0);
  const todayBreakSeconds = gaps.reduce((sum, g) => sum + (g.duration || 0), 0) +
    sessions.reduce((sum, s) => (s.gaps || []).reduce((gs, g) => gs + (g.duration || 0), 0), 0);

  return {
    isRunning,
    elapsed,
    gaps,
    sessions,
    setSessions,
    currentProject,
    setCurrentProject,
    pomodoroMode,
    pomodoroPhase,
    pomodoroElapsed,
    pomodoroCycles,
    play,
    pause,
    reset,
    togglePomodoro,
    todayWorkSeconds,
    todayBreakSeconds,
    WORK_DURATION,
    BREAK_DURATION,
  };
}

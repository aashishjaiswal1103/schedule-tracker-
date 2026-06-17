import React, { useState, useMemo } from 'react';
import { 
  Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp, 
  Calendar, Clock, ArrowLeft, CheckSquare, Square, 
  ClipboardList, Play, Eye
} from 'lucide-react';
import { Card, CardLabel, SectionLabel, Button, Input, Select, Chip, Divider, Textarea } from '../components/UI';
import Modal from '../components/Modal';
import { generateId, getDateKey } from '../lib/utils';
import { saveData, KEYS } from '../lib/storage';

export default function Plans({ profile, setProfile, todayData, setTodayData }) {
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [showAddPlan, setShowAddPlan] = useState(false);
  
  // Add Plan form state
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    type: 'daywise', // daywise | weekwise
    duration: 30,
    startDate: getDateKey(),
    isActive: true
  });

  // Expanded days/weeks state in plan details
  const [expandedPeriod, setExpandedPeriod] = useState({}); // e.g. { "1": true, "2": false }
  
  // New task input state for plan details
  const [newTaskText, setNewTaskText] = useState({}); // e.g. { "1": "task text" }

  const plans = useMemo(() => profile?.plans || [], [profile]);

  const activePlans = useMemo(() => plans.filter(p => p.isActive), [plans]);
  const inactivePlans = useMemo(() => plans.filter(p => !p.isActive), [plans]);

  const selectedPlan = useMemo(() => 
    plans.find(p => p.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  // Helper to save plans list to profile
  const savePlans = (updatedPlans) => {
    const updatedProfile = {
      ...profile,
      plans: updatedPlans,
      updatedAt: new Date().toISOString()
    };
    setProfile(updatedProfile);
    saveData(KEYS.PROFILE, updatedProfile);
    
    // Force a re-render of todayData to recalculate score if today's tasks change
    setTodayData(prev => ({ ...prev }));
  };

  const handleAddPlan = () => {
    if (!newPlan.title.trim()) return;

    // Initialize empty tasks object up to duration
    const tasks = {};
    for (let i = 1; i <= newPlan.duration; i++) {
      tasks[i] = [];
    }

    // Add a default sample task for Day 1 / Week 1 to guide user
    tasks[1] = [
      { id: generateId(), label: 'First Goal Checklist Item', completed: false, completedDate: null }
    ];

    const plan = {
      ...newPlan,
      id: generateId(),
      tasks,
      createdAt: new Date().toISOString()
    };

    savePlans([...plans, plan]);
    setShowAddPlan(false);
    setNewPlan({
      title: '',
      description: '',
      type: 'daywise',
      duration: 30,
      startDate: getDateKey(),
      isActive: true
    });
  };

  const handleDeletePlan = (id) => {
    if (confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      savePlans(plans.filter(p => p.id !== id));
      if (selectedPlanId === id) setSelectedPlanId(null);
    }
  };

  const handleToggleActive = (id) => {
    savePlans(plans.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  // --- DETAIL VIEW ACTIONS ---
  const togglePeriodExpanded = (period) => {
    setExpandedPeriod(prev => ({
      ...prev,
      [period]: !prev[period]
    }));
  };

  const handleAddTask = (period) => {
    const text = newTaskText[period] || '';
    if (!text.trim()) return;

    const task = {
      id: generateId(),
      label: text.trim(),
      completed: false,
      completedDate: null
    };

    const updatedPlans = plans.map(p => {
      if (p.id !== selectedPlan.id) return p;
      const periodTasks = p.tasks[period] || [];
      return {
        ...p,
        tasks: {
          ...p.tasks,
          [period]: [...periodTasks, task]
        }
      };
    });

    savePlans(updatedPlans);
    setNewTaskText(prev => ({ ...prev, [period]: '' }));
  };

  const handleDeleteTask = (period, taskId) => {
    const updatedPlans = plans.map(p => {
      if (p.id !== selectedPlan.id) return p;
      const periodTasks = p.tasks[period] || [];
      return {
        ...p,
        tasks: {
          ...p.tasks,
          [period]: periodTasks.filter(t => t.id !== taskId)
        }
      };
    });
    savePlans(updatedPlans);
  };

  const handleToggleTask = (period, taskId, completed) => {
    const updatedPlans = plans.map(p => {
      if (p.id !== selectedPlan.id) return p;
      const periodTasks = p.tasks[period] || [];
      return {
        ...p,
        tasks: {
          ...p.tasks,
          [period]: periodTasks.map(t => 
            t.id === taskId 
              ? { ...t, completed, completedDate: completed ? getDateKey() : null } 
              : t
          )
        }
      };
    });
    savePlans(updatedPlans);
  };

  // Calculate current period (day or week) of a plan
  const getCurrentPeriodInfo = (plan) => {
    if (!plan.startDate) return { current: 1, text: '', finished: false };
    
    try {
      const start = new Date(plan.startDate + 'T00:00:00');
      const today = new Date(getDateKey() + 'T00:00:00');
      const diffTime = today - start;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return {
          current: 0,
          text: `Starts in ${Math.abs(diffDays)} days`,
          finished: false
        };
      }

      if (plan.type === 'daywise') {
        const day = diffDays + 1;
        if (day > plan.duration) {
          return { current: plan.duration, text: 'Completed Program', finished: true };
        }
        return { current: day, text: `Day ${day} of ${plan.duration}`, finished: false };
      } else {
        const week = Math.floor(diffDays / 7) + 1;
        if (week > plan.duration) {
          return { current: plan.duration, text: 'Completed Program', finished: true };
        }
        return { current: week, text: `Week ${week} of ${plan.duration}`, finished: false };
      }
    } catch {
      return { current: 1, text: '', finished: false };
    }
  };

  // Calculate task completion percentage of a plan
  const getPlanProgress = (plan) => {
    let total = 0;
    let completed = 0;
    Object.values(plan.tasks || {}).forEach(periodTasks => {
      periodTasks.forEach(task => {
        total++;
        if (task.completed) completed++;
      });
    });
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  // Render Plan List
  const renderPlanCard = (plan) => {
    const periodInfo = getCurrentPeriodInfo(plan);
    const progress = getPlanProgress(plan);

    return (
      <Card key={plan.id} className="relative p-6 space-y-4 hover:border-black dark:hover:border-white transition-all">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-muted tracking-widest uppercase flex items-center gap-1.5">
              {plan.type === 'daywise' ? 'Daily Program' : 'Weekly Program'}
              <span className="w-1 h-1 rounded-full bg-border"></span>
              {periodInfo.text}
            </span>
            <h3 className="text-base font-extrabold text-text-primary truncate max-w-[200px] sm:max-w-xs">{plan.title}</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleActive(plan.id)}
              title={plan.isActive ? 'Pause plan' : 'Activate plan'}
              className={`px-2.5 py-1 rounded-chip text-[10px] font-bold border uppercase tracking-wider
                ${plan.isActive 
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-transparent' 
                  : 'bg-transparent text-text-muted border-border'}`}
            >
              {plan.isActive ? 'Active' : 'Paused'}
            </button>
            <button
              onClick={() => handleDeletePlan(plan.id)}
              className="p-1 text-text-muted hover:text-red-500 rounded hover:bg-surface-hover"
              title="Delete Plan"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {plan.description && (
          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">{plan.description}</p>
        )}

        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-bold text-text-secondary">
            <span>Overall checklist progress</span>
            <span>{progress}%</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-divider rounded-full overflow-hidden">
            <div className="h-full bg-text-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <Divider className="!my-3" />

        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full text-xs font-bold py-2 border border-border"
            onClick={() => {
              setSelectedPlanId(plan.id);
              // Expand current active period by default
              if (periodInfo.current > 0) {
                setExpandedPeriod({ [periodInfo.current]: true });
              }
            }}
          >
            <Eye size={13} /> View Plan Timeline
          </Button>
        </div>
      </Card>
    );
  };

  if (selectedPlan) {
    const periodInfo = getCurrentPeriodInfo(selectedPlan);
    const progress = getPlanProgress(selectedPlan);

    return (
      <div className="space-y-6">
        {/* Detail Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSelectedPlanId(null)}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-hover"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-[10px] font-bold text-text-muted tracking-widest uppercase">
              {selectedPlan.type === 'daywise' ? 'Day-wise checklist program' : 'Week-wise checklist program'}
            </span>
            <h2 className="text-lg font-extrabold text-text-primary">{selectedPlan.title}</h2>
          </div>
        </div>

        {/* Info panel */}
        <Card className="p-5 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="space-y-1.5">
            {selectedPlan.description && (
              <p className="text-xs text-text-secondary max-w-xl leading-relaxed">{selectedPlan.description}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted font-medium">
              <span className="flex items-center gap-1"><Calendar size={12} /> Started: {selectedPlan.startDate}</span>
              <span className="flex items-center gap-1"><Clock size={12} /> Duration: {selectedPlan.duration} {selectedPlan.type === 'daywise' ? 'days' : 'weeks'}</span>
            </div>
          </div>

          <div className="shrink-0 space-y-1 text-right md:w-48">
            <div className="flex justify-between text-xs font-bold text-text-secondary">
              <span>Overall Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-divider rounded-full overflow-hidden">
              <div className="h-full bg-text-primary rounded-full transition-all" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-[10px] text-text-muted font-bold tracking-wide mt-1 uppercase">{periodInfo.text}</p>
          </div>
        </Card>

        {/* Timeline List */}
        <div className="space-y-4">
          <SectionLabel>Timeline Checklist</SectionLabel>

          <div className="space-y-3">
            {Object.keys(selectedPlan.tasks || {})
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map((period) => {
                const periodTasks = selectedPlan.tasks[period] || [];
                const isExpanded = !!expandedPeriod[period];
                const isCurrent = parseInt(period) === periodInfo.current && !periodInfo.finished;
                
                const periodLabel = selectedPlan.type === 'daywise' ? `Day ${period}` : `Week ${period}`;
                const completedCount = periodTasks.filter(t => t.completed).length;
                const totalCount = periodTasks.length;

                return (
                  <Card 
                    key={period} 
                    className={`!p-0 border overflow-hidden transition-all
                      ${isCurrent ? 'ring-1 ring-black dark:ring-white border-black dark:border-white' : ''}`}
                  >
                    {/* Period Row Header */}
                    <div 
                      onClick={() => togglePeriodExpanded(period)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-surface-hover select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-bold text-[13px] text-text-primary">
                          {periodLabel}
                        </span>
                        {isCurrent && (
                          <Chip variant="success" className="text-[9px] font-bold uppercase py-0.5 tracking-wider">
                            Active Target
                          </Chip>
                        )}
                        <span className="text-xs text-text-muted font-medium">
                          ({completedCount} / {totalCount} completed)
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {/* Period Tasks Checklist */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 bg-surface border-t border-divider space-y-4">
                        {/* Task List */}
                        <div className="space-y-2.5">
                          {periodTasks.length > 0 ? (
                            periodTasks.map((task) => (
                              <div key={task.id} className="flex items-center justify-between gap-4 py-2 border-b border-divider last:border-b-0">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <button
                                    onClick={() => handleToggleTask(period, task.id, !task.completed)}
                                    className="text-text-secondary hover:text-text-primary shrink-0 transition-colors"
                                  >
                                    {task.completed ? (
                                      <CheckSquare size={17} className="text-black dark:text-white" />
                                    ) : (
                                      <Square size={17} />
                                    )}
                                  </button>
                                  <span className={`text-[13px] font-bold truncate flex-1 ${task.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                                    {task.label}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteTask(period, task.id)}
                                  className="text-text-muted hover:text-red-500 p-1 rounded hover:bg-surface-hover"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-text-muted py-2">No items planned for this period.</p>
                          )}
                        </div>

                        {/* Quick Add Form */}
                        <div className="flex gap-2">
                          <Input
                            placeholder={`e.g. Solve 2 problems, Revise chapter...`}
                            value={newTaskText[period] || ''}
                            onChange={(e) => setNewTaskText(prev => ({ ...prev, [period]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddTask(period);
                            }}
                            className="text-xs py-2 px-3 flex-1"
                          />
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="text-xs py-2 px-4 border border-border"
                            onClick={() => handleAddTask(period)}
                          >
                            Add Target
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <SectionLabel>Followed Plans</SectionLabel>
          <p className="text-xs text-text-secondary -mt-2">Track day-wise and week-wise targets across your checklist programs.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowAddPlan(true)}>
          <Plus size={13} /> Create Checklist Plan
        </Button>
      </div>

      {/* Active Plans Section */}
      <div className="space-y-4">
        <SectionLabel>Active Programs</SectionLabel>
        {activePlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePlans.map(renderPlanCard)}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-border rounded-card">
            <ClipboardList size={32} className="mx-auto text-text-muted mb-2 stroke-[1.25]" />
            <p className="text-xs text-text-secondary font-bold">No active plans followed</p>
            <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
              Create a daily/weekly program checklist like "100 Days of Code" or "Gym Routine"!
            </p>
          </div>
        )}
      </div>

      {/* Paused Plans Section */}
      {inactivePlans.length > 0 && (
        <div className="space-y-4">
          <SectionLabel>Paused Programs</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inactivePlans.map(renderPlanCard)}
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      <Modal isOpen={showAddPlan} onClose={() => setShowAddPlan(false)} title="Create Checklist Plan">
        <div className="space-y-4">
          <div>
            <CardLabel>Plan Title</CardLabel>
            <Input
              value={newPlan.title}
              onChange={(e) => setNewPlan(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Learn React in 30 Days, 12-Week Gym Program"
              className="mt-1"
            />
          </div>
          <div>
            <CardLabel>Description (Optional)</CardLabel>
            <Textarea
              value={newPlan.description}
              onChange={(e) => setNewPlan(p => ({ ...p, description: e.target.value }))}
              placeholder="Outline the goals and outcomes of this plan..."
              className="mt-1 h-20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <CardLabel>Program Type</CardLabel>
              <Select
                value={newPlan.type}
                onChange={(e) => setNewPlan(p => ({ ...p, type: e.target.value }))}
                className="mt-1 w-full"
              >
                <option value="daywise">Day-wise</option>
                <option value="weekwise">Week-wise</option>
              </Select>
            </div>
            <div>
              <CardLabel>Duration</CardLabel>
              <Input
                type="number"
                min="1"
                max="365"
                value={newPlan.duration}
                onChange={(e) => setNewPlan(p => ({ ...p, duration: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="mt-1 w-full"
              />
            </div>
          </div>
          <div>
            <CardLabel>Start Date</CardLabel>
            <Input
              type="date"
              value={newPlan.startDate}
              onChange={(e) => setNewPlan(p => ({ ...p, startDate: e.target.value }))}
              className="mt-1"
            />
          </div>
          <Button onClick={handleAddPlan} className="w-full mt-2">Create Program</Button>
        </div>
      </Modal>
    </div>
  );
}

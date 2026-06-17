// Daily Score Calculator (out of 100 + bonus)

export function calculateDailyScore(todayData, profile) {
  let score = 0;

  // 1. Schedule completion: 40 pts
  const schedule = todayData.schedule || [];
  const total = schedule.length;
  const checked = schedule.filter((b) => b.completed).length;
  const scheduleCompletion = total > 0 ? checked / total : 0;
  score += Math.round(scheduleCompletion * 40);

  // 2. Habits: 20 pts (5 each)
  const habits = todayData.habits || {};
  if (habits.grooming) score += 5;
  if (habits.medicine) score += 5;
  if ((todayData.hydration || 0) >= (profile?.hydrationGoal || 8)) score += 5;
  if (todayData.sleepLogged) score += 5;

  // 3. Work hours vs target: 20 pts
  const workMinutes = todayData.workMinutes || 0;
  const targetMinutes = (profile?.dailyWorkHourGoal || 8) * 60;
  const workRatio = targetMinutes > 0 ? Math.min(workMinutes / targetMinutes, 1) : 0;
  score += Math.round(workRatio * 20);

  // 4. Wasted time penalty: up to -10
  const wastedMinutes = todayData.wastedMinutes || 0;
  const penalty = Math.min(Math.round(wastedMinutes / 6), 10); // -1 pt per 6 min, max -10
  score -= penalty;

  // 5. Energy/mood logged: 5 pts
  const energyLogs = todayData.energyLogs || [];
  if (energyLogs.length > 0) score += 5;

  // 6. Tomorrow planned: 5 pts
  if (todayData.tomorrowPlanned) score += 5;

  // 7. Plan tasks checklist: 10 pts
  let totalTargetTasks = 0;
  let completedTargetTasks = 0;
  let completedOtherTasksToday = 0;

  const activePlans = profile?.plans ? profile.plans.filter((p) => p.isActive) : [];

  activePlans.forEach((plan) => {
    if (!plan.startDate) return;

    try {
      const date1 = new Date(plan.startDate + 'T00:00:00');
      const date2 = new Date(todayData.date + 'T00:00:00');
      const diffTime = date2 - date1;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return;

      if (plan.type === 'daywise') {
        const dayIndex = diffDays + 1;
        if (dayIndex <= plan.duration) {
          const tasksForDay = plan.tasks && plan.tasks[dayIndex] ? plan.tasks[dayIndex] : [];
          tasksForDay.forEach((task) => {
            totalTargetTasks++;
            if (task.completed) {
              completedTargetTasks++;
            }
          });
        }
      } else if (plan.type === 'weekwise') {
        const weekIndex = Math.floor(diffDays / 7) + 1;
        if (weekIndex <= plan.duration) {
          Object.values(plan.tasks || {}).forEach((weekTasks) => {
            weekTasks.forEach((task) => {
              if (task.completed && task.completedDate === todayData.date) {
                completedOtherTasksToday++;
              }
            });
          });
        }
      }
    } catch (e) {
      console.warn('Error calculating plan task score:', e);
    }
  });

  let planTasksScore = 10;
  if (totalTargetTasks > 0) {
    const ratio = Math.min((completedTargetTasks + completedOtherTasksToday) / totalTargetTasks, 1);
    planTasksScore = Math.round(ratio * 10);
  } else if (activePlans.length > 0) {
    // If there are only weekwise plans, give score based on weekly tasks completed today
    if (completedOtherTasksToday > 0) {
      planTasksScore = 10;
    } else {
      planTasksScore = 0; // If they have weekly plans but completed nothing today
    }
  }

  score += planTasksScore;

  // Clamp to 0–100 before bonus
  const baseScore = Math.max(0, Math.min(score, 100));

  // 8. Bonus: +5 for perfect day (all 100 before bonus)
  const finalScore = baseScore >= 100 ? 105 : baseScore;

  return {
    score: finalScore,
    breakdown: {
      scheduleCompletion: Math.round(scheduleCompletion * 40),
      habits: (habits.grooming ? 5 : 0) + (habits.medicine ? 5 : 0) +
              ((todayData.hydration || 0) >= (profile?.hydrationGoal || 8) ? 5 : 0) +
              (todayData.sleepLogged ? 5 : 0),
      workHours: Math.round(workRatio * 20),
      wastedPenalty: -penalty,
      energyLogged: energyLogs.length > 0 ? 5 : 0,
      tomorrowPlanned: todayData.tomorrowPlanned ? 5 : 0,
      planTasks: planTasksScore,
      bonus: baseScore >= 100 ? 5 : 0,
    },
    scheduleCompletion,
  };
}

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  Brain, Timer, Volume2, ListTodo, BarChart3,
  Play, Pause, ChevronRight, Flame,
} from 'lucide-react';
import { useTimer, useTimerRemaining, MODE_LABELS } from '../../context/TimerContext';
import { SOUND_DEFS, getState as getAudioState, subscribe as subscribeAudio } from '../../lib/audioEngine';
import { getLastDays, getStreak, getTotals, subscribeStats } from '../../lib/stats';

// Shared shell so every summary card reads as one family: icon, title, an
// "Open" link into the full app, then whatever compact content it needs.
function SummaryCard({ icon: Icon, iconColor, title, onOpen, openLabel, children, glow }) {
  return (
    <Card className="overview-card" glow={glow} hoverEffect>
      <CardHeader style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
        <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
          <Icon size={16} style={{ color: iconColor }} />
          <span>{title}</span>
        </CardTitle>
        <button className="overview-open-link" onClick={onOpen}>
          {openLabel}
          <ChevronRight size={12} />
        </button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function CoachSummaryCard({ energy, onOpen }) {
  return (
    <SummaryCard icon={Brain} iconColor="var(--color-gold)" title="AI Focus Coach" onOpen={onOpen} openLabel="Open">
      <div className="overview-stat-row">
        <span className="overview-stat-label">Cognitive capacity</span>
        <span className="overview-stat-value">{energy * 10}%</span>
      </div>
      <Progress value={energy * 10} className="overview-progress" />
      <p className="overview-hint">Align your next focus block to your energy level.</p>
    </SummaryCard>
  );
}

export function TimerSummaryCard({ onOpen }) {
  const timer = useTimer();
  const remaining = useTimerRemaining();
  const mins = Math.floor(remaining / 60);
  const secs = String(remaining % 60).padStart(2, '0');
  const pct = timer.duration > 0 ? ((timer.duration - remaining) / timer.duration) * 100 : 0;

  return (
    <SummaryCard icon={Timer} iconColor="var(--color-cyan)" title="Wave Focus Timer" onOpen={onOpen} openLabel="Open" glow={timer.running}>
      <div className="overview-timer-row">
        <div className="overview-timer-clock">{mins}:{secs}</div>
        <div className="overview-timer-meta">
          <span>{MODE_LABELS[timer.mode]}</span>
          <Button
            size="sm"
            variant={timer.running ? 'neon-purple' : 'neon-cyan'}
            onClick={timer.running ? timer.pause : timer.start}
            style={{ height: 28, padding: '0 12px', fontSize: 11 }}
          >
            {timer.running ? <Pause size={12} style={{ marginRight: 4 }} /> : <Play size={12} style={{ marginRight: 4 }} />}
            {timer.running ? 'Pause' : 'Start'}
          </Button>
        </div>
      </div>
      <Progress value={pct} className="overview-progress" />
    </SummaryCard>
  );
}

function useAudioSummary() {
  const [audio, setAudio] = useState(getAudioState);
  useEffect(() => subscribeAudio(setAudio), []);
  const activeCount = Object.values(audio.tracks).filter((t) => t.active).length;
  return { master: audio.master, activeCount };
}

export function SynthSummaryCard({ onOpen }) {
  const { master, activeCount } = useAudioSummary();
  return (
    <SummaryCard icon={Volume2} iconColor="var(--color-purple)" title="Procedural Audio Mixer" onOpen={onOpen} openLabel="Open" glow={activeCount > 0}>
      <div className="overview-stat-row">
        <span className="overview-stat-label">
          {activeCount > 0 ? `${activeCount} track${activeCount === 1 ? '' : 's'} playing` : 'Nothing playing'}
        </span>
        <span className="overview-stat-value">{Math.round(master * 100)}%</span>
      </div>
      <Progress value={master * 100} className="overview-progress" />
      <p className="overview-hint">
        {activeCount > 0 ? `Master volume · ${SOUND_DEFS.length} soundscapes available` : 'Layer in ambient sound while you focus.'}
      </p>
    </SummaryCard>
  );
}

export function TasksSummaryCard({ tasks, onOpen }) {
  const completed = tasks.filter((t) => t.completed).length;
  const pending = tasks.filter((t) => !t.completed).slice(0, 3);
  const pct = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;

  return (
    <SummaryCard icon={ListTodo} iconColor="var(--color-emerald)" title="Task Board" onOpen={onOpen} openLabel="Open" glow={completed > 0}>
      <div className="overview-stat-row">
        <span className="overview-stat-label">{completed} / {tasks.length} done</span>
      </div>
      <Progress value={pct} className="overview-progress" />
      {pending.length > 0 ? (
        <ul className="overview-task-list">
          {pending.map((t) => (
            <li key={t.id}>
              <span className={`overview-task-dot priority-${t.priority || 'med'}`} />
              {t.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="overview-hint">All clear — nice work.</p>
      )}
    </SummaryCard>
  );
}

function useStatsSummary() {
  const compute = useCallback(() => ({
    today: getLastDays(1)[0],
    streak: getStreak(),
    totals: getTotals(),
  }), []);
  const [stats, setStats] = useState(compute);
  useEffect(() => subscribeStats(() => setStats(compute())), [compute]);
  return stats;
}

export function StatsSummaryCard({ onOpen }) {
  const { today, streak, totals } = useStatsSummary();
  return (
    <SummaryCard icon={BarChart3} iconColor="var(--color-blue)" title="Focus Statistics" onOpen={onOpen} openLabel="Open" glow={streak > 0}>
      <div className="overview-mini-tiles">
        <div className="overview-mini-tile">
          <div className="overview-mini-value">{today?.focusMinutes ?? 0}m</div>
          <div className="overview-mini-label">Today</div>
        </div>
        <div className="overview-mini-tile">
          <div className="overview-mini-value" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {streak > 0 && <Flame size={13} style={{ color: 'var(--color-gold)' }} />}
            {streak}
          </div>
          <div className="overview-mini-label">Streak</div>
        </div>
        <div className="overview-mini-tile">
          <div className="overview-mini-value">{totals.tasksCompleted}</div>
          <div className="overview-mini-label">Cleared</div>
        </div>
      </div>
    </SummaryCard>
  );
}

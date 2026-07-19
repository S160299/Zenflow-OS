import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { BarChart3, Flame, Timer, CheckCircle2, Table2 } from 'lucide-react';
import { getLastDays, getStreak, getTotals, subscribeStats, dateKey } from '../lib/stats';

function useStats() {
  const compute = useCallback(() => ({
    days: getLastDays(7),
    streak: getStreak(),
    totals: getTotals(),
  }), []);
  const [stats, setStats] = useState(compute);
  useEffect(() => subscribeStats(() => setStats(compute())), [compute]);
  return stats;
}

export default function StatsApp({ tasks = [] }) {
  const { days, streak, totals } = useStats();
  const [hovered, setHovered] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const today = days[days.length - 1];
  const maxMinutes = Math.max(...days.map((d) => d.focusMinutes), 1);
  const maxDayKey = days.reduce((a, b) => (b.focusMinutes > a.focusMinutes ? b : a)).key;
  const hasData = days.some((d) => d.focusMinutes > 0);
  const openTasks = tasks.filter((t) => !t.completed).length;

  const tiles = [
    {
      id: 'today',
      label: 'FOCUS TODAY',
      value: `${today?.focusMinutes ?? 0}m`,
      icon: Timer,
      color: 'var(--color-cyan)',
      sub: `${today?.sessions ?? 0} session${(today?.sessions ?? 0) === 1 ? '' : 's'}`,
    },
    {
      id: 'streak',
      label: 'DAY STREAK',
      value: streak,
      icon: Flame,
      color: 'var(--color-gold)',
      sub: streak > 0 ? 'Keep it alive!' : 'Start one today',
    },
    {
      id: 'sessions',
      label: 'TOTAL SESSIONS',
      value: totals.sessions,
      icon: BarChart3,
      color: 'var(--color-purple)',
      sub: `${Math.round(totals.focusMinutes / 60 * 10) / 10}h lifetime`,
    },
    {
      id: 'tasks',
      label: 'TASKS CLEARED',
      value: totals.tasksCompleted,
      icon: CheckCircle2,
      color: 'var(--color-emerald)',
      sub: `${openTasks} still open`,
    },
  ];

  return (
    <Card className="stats-card" glow={streak > 0} hoverEffect={true}>
      <CardHeader style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={20} style={{ color: 'var(--color-blue)' }} />
            <span>Focus Statistics</span>
          </CardTitle>
          <CardDescription>Focus minutes, streaks, and cleared tasks over time</CardDescription>
        </div>
        <button
          className="btn-guide-tab"
          onClick={() => setShowTable((v) => !v)}
          title={showTable ? 'Show chart' : 'Show as table'}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Table2 size={12} /> {showTable ? 'Chart' : 'Table'}
        </button>
      </CardHeader>

      <CardContent>
        {/* Stat tiles */}
        <div className="stats-tile-row">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div key={tile.id} className="stats-tile">
                <div className="stats-tile-head">
                  <Icon size={13} style={{ color: tile.color }} />
                  <span>{tile.label}</span>
                </div>
                <div className="stats-tile-value">{tile.value}</div>
                <div className="stats-tile-sub">{tile.sub}</div>
              </div>
            );
          })}
        </div>

        <div className="stats-chart-block">
          <div className="stats-chart-title">Focus minutes — last 7 days</div>

          {!hasData ? (
            <div className="stats-empty">
              No focus sessions recorded yet.<br />
              Run the Wave Timer to start building your streak.
            </div>
          ) : showTable ? (
            <table className="stats-table">
              <thead>
                <tr><th>Day</th><th>Focus</th><th>Sessions</th><th>Tasks done</th></tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.key} className={d.isToday ? 'today-row' : ''}>
                    <td>{d.isToday ? 'Today' : d.label}</td>
                    <td>{d.focusMinutes}m</td>
                    <td>{d.sessions}</td>
                    <td>{d.tasksCompleted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="stats-chart" role="img" aria-label={`Bar chart of focus minutes for the last 7 days. Today: ${today?.focusMinutes ?? 0} minutes.`}>
              {days.map((d) => {
                const heightPct = (d.focusMinutes / maxMinutes) * 100;
                // Direct-label only today and the best day; the rest on hover
                const directLabel = d.isToday || (d.key === maxDayKey && d.focusMinutes > 0);
                return (
                  <div
                    key={d.key}
                    className="stats-chart-col"
                    onMouseEnter={() => setHovered(d.key)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {hovered === d.key && (
                      <div className="stats-tooltip">
                        {d.isToday ? 'Today' : d.label} · {d.focusMinutes}m · {d.sessions} session{d.sessions === 1 ? '' : 's'}
                      </div>
                    )}
                    <div className="stats-bar-track">
                      {directLabel && hovered !== d.key && d.focusMinutes > 0 && (
                        <span
                          className="stats-bar-label"
                          style={{ bottom: `calc(${Math.max(heightPct, 4)}% + 4px)` }}
                        >
                          {d.focusMinutes}
                        </span>
                      )}
                      <div
                        className={`stats-bar ${d.isToday ? 'today' : ''}`}
                        style={{ transform: `scaleY(${Math.max(heightPct, d.focusMinutes > 0 ? 4 : 0) / 100})` }}
                      />
                    </div>
                    <span className={`stats-axis-label ${d.isToday ? 'today' : ''}`}>
                      {d.isToday ? 'Today' : d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="stats-footnote">
          Sessions are recorded when a focus phase completes ({dateKey()} local time).
        </div>
      </CardContent>
    </Card>
  );
}

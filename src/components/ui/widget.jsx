import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon, Calendar as CalendarIcon, Zap, CheckCircle, Flame } from 'lucide-react';

export function Widget({
  className = '',
  size = 'sm',
  variant = 'default',
  design = 'default',
  children,
  ...props
}) {
  const baseClass = 'sads-widget';
  const sizeClass = `sads-widget-${size}`;
  const variantClass = `sads-widget-${variant}`;
  const designClass = design === 'mumbai' ? 'sads-widget-mumbai' : '';

  return (
    <div
      className={`${baseClass} ${sizeClass} ${variantClass} ${designClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function WidgetHeader({ className = '', children, ...props }) {
  return (
    <div className={`sads-widget-header ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function WidgetTitle({ className = '', children, ...props }) {
  return (
    <h4 className={`sads-widget-title ${className}`.trim()} {...props}>
      {children}
    </h4>
  );
}

export function WidgetContent({ className = '', children, ...props }) {
  return (
    <div className={`sads-widget-content ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function WidgetFooter({ className = '', children, ...props }) {
  return (
    <div className={`sads-widget-footer ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function WidgetValue({ className = '', children, ...props }) {
  return (
    <div className={`sads-widget-value ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function WidgetBadge({ className = '', variant = 'default', children, ...props }) {
  const baseClass = 'sads-widget-badge';
  const variantClass = `sads-widget-badge-${variant}`;
  return (
    <span className={`${baseClass} ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                         Wigggle UI Preset Widgets                           */
/* -------------------------------------------------------------------------- */

export function ClockWidget({ className = '' }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <Widget size="sm" variant="glass" className={`clock-widget ${className}`}>
      <WidgetHeader>
        <WidgetTitle style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClockIcon size={14} style={{ color: 'var(--color-cyan)' }} />
          <span>Live Clock</span>
        </WidgetTitle>
        <WidgetBadge variant="secondary">LOCAL</WidgetBadge>
      </WidgetHeader>
      <WidgetContent>
        <WidgetValue style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-title)', color: '#fff', letterSpacing: '-0.5px' }}>
          {hours}
        </WidgetValue>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{dateStr}</div>
      </WidgetContent>
      <WidgetFooter>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-emerald)', display: 'inline-block' }}></span>
          System Synced
        </div>
      </WidgetFooter>
    </Widget>
  );
}

export function CalendarWidget({ className = '' }) {
  const today = new Date();
  const currentDay = today.getDate();
  const monthName = today.toLocaleDateString([], { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const gridCells = [];

  for (let i = 0; i < firstDayOfMonth; i++) {
    gridCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push(d);
  }

  return (
    <Widget size="md" variant="glass" className={`calendar-widget ${className}`}>
      <WidgetHeader>
        <WidgetTitle style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarIcon size={14} style={{ color: 'var(--color-purple)' }} />
          <span>{monthName}</span>
        </WidgetTitle>
        <WidgetBadge variant="default">CALENDAR</WidgetBadge>
      </WidgetHeader>
      <WidgetContent>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', marginBottom: 6 }}>
          {dayHeaders.map((h, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{h}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
          {gridCells.slice(0, 35).map((d, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                padding: '4px 0',
                borderRadius: 6,
                background: d === currentDay ? 'var(--color-purple)' : 'transparent',
                color: d === currentDay ? '#fff' : d ? 'var(--text-primary)' : 'transparent',
                fontWeight: d === currentDay ? 700 : 400,
                boxShadow: d === currentDay ? '0 0 8px rgba(179, 54, 255, 0.5)' : 'none',
              }}
            >
              {d || ''}
            </div>
          ))}
        </div>
      </WidgetContent>
    </Widget>
  );
}

export function MetricsWidget({ className = '', focusRounds = 0, completedTasks = 0, energy = 8 }) {
  return (
    <Widget size="sm" variant="glass" className={`metrics-widget ${className}`}>
      <WidgetHeader>
        <WidgetTitle style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={14} style={{ color: 'var(--color-gold)' }} />
          <span>Cognitive Stats</span>
        </WidgetTitle>
        <WidgetBadge variant="neon">REALTIME</WidgetBadge>
      </WidgetHeader>
      <WidgetContent style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Flame size={12} style={{ color: 'var(--color-rose)' }} /> Focus Rounds
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{focusRounds}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={12} style={{ color: 'var(--color-emerald)' }} /> Tasks Done
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{completedTasks}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Energy Level</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-gold)' }}>{`${energy * 10}%`}</span>
        </div>
      </WidgetContent>
    </Widget>
  );
}

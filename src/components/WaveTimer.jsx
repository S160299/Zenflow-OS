import React, { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Play, Pause, RotateCcw, Timer, SkipForward, Crosshair } from 'lucide-react';
import { useTimer, useTimerRemaining, MODE_LABELS } from '../context/TimerContext';

const MODE_ORDER = ['focus', 'short', 'long'];

export default function WaveTimer() {
  const timer = useTimer();
  const remaining = useTimerRemaining();
  const canvasRef = useRef(null);

  // The animation loop reads live values from this ref so the canvas is set up
  // once per mount instead of being torn down and rebuilt every second.
  const liveRef = useRef({ progress: 1, running: false });
  liveRef.current = {
    progress: timer.duration > 0 ? remaining / timer.duration : 0,
    running: timer.running,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    let angle = 0;
    let frame;
    const particles = Array.from({ length: 20 }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height + rect.height,
      size: Math.random() * 2 + 1,
      speedY: Math.random() * 0.8 + 0.2,
      opacity: Math.random() * 0.5 + 0.2,
    }));

    const render = () => {
      const { progress, running } = liveRef.current;
      ctx.clearRect(0, 0, rect.width, rect.height);

      const liquidHeight = rect.height * progress;
      const targetY = rect.height - liquidHeight;
      angle += running ? 0.04 : 0.01;

      // Back wave
      ctx.fillStyle = 'rgba(179, 54, 255, 0.25)';
      ctx.beginPath();
      ctx.moveTo(0, rect.height);
      for (let x = 0; x <= rect.width; x++) {
        ctx.lineTo(x, targetY + Math.sin(x * 0.03 + angle + Math.PI) * 6);
      }
      ctx.lineTo(rect.width, rect.height);
      ctx.closePath();
      ctx.fill();

      // Front wave
      ctx.fillStyle = 'rgba(0, 242, 254, 0.35)';
      ctx.beginPath();
      ctx.moveTo(0, rect.height);
      for (let x = 0; x <= rect.width; x++) {
        ctx.lineTo(x, targetY + Math.sin(x * 0.025 + angle) * 8);
      }
      ctx.lineTo(rect.width, rect.height);
      ctx.closePath();
      ctx.fill();

      // Bubbles
      particles.forEach((p) => {
        if (running) p.y -= p.speedY;
        if (p.y < targetY) {
          p.y = rect.height + Math.random() * 10;
          p.x = Math.random() * rect.width;
        }
        ctx.fillStyle = `rgba(0, 242, 254, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Surface highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, targetY + Math.sin(angle) * 8);
      for (let x = 0; x <= rect.width; x++) {
        ctx.lineTo(x, targetY + Math.sin(x * 0.025 + angle) * 8);
      }
      ctx.stroke();

      frame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frame);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const focusRound = (timer.round % 4) + (timer.mode === 'focus' ? 1 : 0);

  return (
    <Card className="timer-card" glow={timer.running} hoverEffect={true}>
      <CardHeader style={{ alignItems: 'center' }}>
        <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Timer size={20} style={{ color: 'var(--color-cyan)' }} />
          <span>Wave Focus Timer</span>
        </CardTitle>
        <CardDescription>
          Pomodoro cycles that keep flowing while you work in other apps
        </CardDescription>
      </CardHeader>

      <CardContent style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="timer-radial-pod">
          <canvas
            ref={canvasRef}
            className="timer-fluid-canvas"
            style={{ width: '100%', height: '100%' }}
          />
          <div className="timer-radial-text">
            <div className="timer-radial-clock">{formatTime(remaining)}</div>
            <div className="timer-radial-lbl">
              {MODE_LABELS[timer.mode].toUpperCase()}
              {timer.mode === 'focus' ? ` · ROUND ${focusRound}/4` : ''}
            </div>
            {timer.focusTask && timer.mode === 'focus' && (
              <div className="timer-focus-task" title={timer.focusTask.text}>
                <Crosshair size={9} style={{ marginRight: 4, flexShrink: 0 }} />
                {timer.focusTask.text}
              </div>
            )}
          </div>
        </div>

        {/* Action controls */}
        <div style={{ display: 'flex', gap: 10, margin: '10px 0 20px 0' }}>
          <Button
            onClick={timer.running ? timer.pause : timer.start}
            variant={timer.running ? 'neon-purple' : 'neon-cyan'}
            style={{ width: 104, height: 38 }}
          >
            {timer.running ? <Pause size={14} style={{ marginRight: 6 }} /> : <Play size={14} style={{ marginRight: 6 }} />}
            {timer.running ? 'Pause' : 'Start'}
          </Button>

          <Button onClick={timer.reset} variant="outline" style={{ width: 90, height: 38 }}>
            <RotateCcw size={14} style={{ marginRight: 6 }} />
            Reset
          </Button>

          <Button onClick={timer.skip} variant="glass" style={{ width: 60, height: 38 }} title="Skip to the next phase">
            <SkipForward size={14} />
          </Button>
        </div>

        {/* Mode presets */}
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          {MODE_ORDER.map((mode) => (
            <Button
              key={mode}
              onClick={() => timer.selectMode(mode)}
              variant={timer.mode === mode ? 'neon-cyan' : 'glass'}
              style={{ flex: 1, height: 32, fontSize: 11, padding: 0 }}
            >
              {MODE_LABELS[mode]} ({timer.durations[mode]}m)
            </Button>
          ))}
        </div>

        {/* Duration + cycle settings */}
        <div className="timer-settings-row">
          <label className="timer-settings-label" htmlFor="duration-input">
            {MODE_LABELS[timer.mode]} length
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              id="duration-input"
              type="number"
              min="1"
              max="180"
              value={timer.durations[timer.mode]}
              disabled={timer.running}
              onChange={(e) => timer.setDuration(timer.mode, Number(e.target.value))}
              className="timer-duration-input"
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>min</span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {timer.autoCycle ? 'Auto-cycling · long break every 4th round' : 'Manual mode — enable auto-cycle in settings'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

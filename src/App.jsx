import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import WaveTimer from './components/WaveTimer';
import SoundMixer from './components/SoundMixer';
import TaskList from './components/TaskList';
import AIPal from './components/AIPal';
import StatsApp from './components/StatsApp';
import CommandPalette from './components/CommandPalette';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider, toast } from './components/ui/toast';
import { Switch } from './components/ui/switch';
import { TimerProvider, useTimer, useTimerRemaining, MODE_LABELS } from './context/TimerContext';
import { loadJSON, saveJSON, loadString, saveString } from './lib/storage';
import { PROVIDERS, hasUsableKey } from './lib/ai';
import { SOUND_DEFS, toggleTrack, isActive as isSoundActive, subscribe as subscribeAudio } from './lib/audioEngine';
import {
  Sparkles, Brain, Timer, Volume2, ListTodo,
  Settings, Grid, KeyRound, CheckCircle2, ChevronDown,
  BarChart3, Command, Play, Pause, SkipForward, RotateCcw, Music,
} from 'lucide-react';

const APPS = [
  { id: 'aipal', title: 'AI Focus Coach', short: 'Coach', sub: 'Roadmap', icon: Brain, color: 'var(--color-gold)' },
  { id: 'wavetimer', title: 'Wave Focus Timer', short: 'Timer', sub: 'Wave Flow', icon: Timer, color: 'var(--color-cyan)' },
  { id: 'soundboard', title: 'Procedural Audio Mixer', short: 'Synth', sub: 'Synth Mixer', icon: Volume2, color: 'var(--color-purple)' },
  { id: 'tasks', title: 'Holographic Task Board', short: 'Tasks', sub: null, icon: ListTodo, color: 'var(--color-emerald)' },
  { id: 'stats', title: 'Focus Statistics', short: 'Stats', sub: 'Insights', icon: BarChart3, color: 'var(--color-blue)' },
];

const ACCENTS = [
  { id: 'cyan', color: '#00f2fe' },
  { id: 'purple', color: '#b336ff' },
  { id: 'emerald', color: '#05ffa1' },
  { id: 'gold', color: '#ffd644' },
  { id: 'rose', color: '#ff2a7f' },
];

const WALLPAPERS = [
  { id: 'aurora', label: 'Aurora' },
  { id: 'nebula', label: 'Nebula' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'graphite', label: 'Graphite' },
];

const DEFAULT_TASKS = [
  { id: 1, text: 'Review hackathon guidelines', completed: true },
  { id: 2, text: 'Create premium React UI components', completed: false },
  { id: 3, text: 'Connect audio nodes for soundboard', completed: false },
  { id: 4, text: 'Initialize AI schedule agent', completed: false },
];

// Older saved tasks predate priority/due/pomodoro fields
function migrateTasks(tasks) {
  return (Array.isArray(tasks) ? tasks : DEFAULT_TASKS).map((t) => ({
    priority: 'med',
    due: null,
    pomodoros: 0,
    ...t,
  }));
}

// The clock and timer chip tick every second, so they live in their own
// components — keeping that churn out of the whole-app AppContent render.
function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return <span className="status-bar-time">{date} {time}</span>;
}

function TimerChip({ onOpen }) {
  const timer = useTimer();
  const remaining = useTimerRemaining();
  const mins = Math.floor(remaining / 60);
  const secs = String(remaining % 60).padStart(2, '0');
  return (
    <button
      className={`status-bar-stat timer-chip ${timer.running ? 'running' : ''}`}
      onClick={onOpen}
      title={`${MODE_LABELS[timer.mode]} — click to open timer`}
    >
      <Timer size={13} style={{ color: timer.running ? 'var(--color-cyan)' : 'var(--text-muted)' }} />
      <span>{mins}:{secs}</span>
    </button>
  );
}

function AppContent({ tasks, setTasks }) {
  const timer = useTimer();

  const [viewMode, setViewModeRaw] = useState(() => loadString('zenflow_view_mode', 'stage'));
  const [activeApp, setActiveAppRaw] = useState(() => {
    const saved = loadString('zenflow_active_app', 'aipal');
    return APPS.some((a) => a.id === saved) ? saved : 'aipal';
  });
  const [energyLevel, setEnergyLevelRaw] = useState(() => loadJSON('zenflow_energy', 8));
  const [showControlDrawer, setShowControlDrawer] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [windowFull, setWindowFull] = useState(false);
  const [winOffset, setWinOffset] = useState({ x: 0, y: 0 });

  // Appearance settings
  const [accent, setAccent] = useState(() => loadString('zenflow_accent', 'cyan'));
  const [wallpaper, setWallpaper] = useState(() => loadString('zenflow_wallpaper', 'aurora'));
  const [reduceMotion, setReduceMotion] = useState(() => loadJSON('zenflow_reduce_motion', false));

  // AI provider settings
  const [aiProvider, setAiProvider] = useState(() => loadString('zenflow_ai_provider', 'openai'));
  const [apiKeys, setApiKeys] = useState(() => ({ openai: loadString('zenflow_openai_key', '') }));
  const keyAtFocusRef = useRef('');

  const setViewMode = useCallback((mode) => {
    setViewModeRaw(mode);
    saveString('zenflow_view_mode', mode);
  }, []);

  const setActiveApp = useCallback((id) => {
    setActiveAppRaw(id);
    saveString('zenflow_active_app', id);
  }, []);

  const setEnergyLevel = useCallback((level) => {
    setEnergyLevelRaw(level);
    saveJSON('zenflow_energy', level);
  }, []);

  // Apply appearance to the document root
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = accent;
    root.dataset.wallpaper = wallpaper;
    root.dataset.motion = reduceMotion ? 'reduce' : 'full';
    saveString('zenflow_accent', accent);
    saveString('zenflow_wallpaper', wallpaper);
    saveJSON('zenflow_reduce_motion', reduceMotion);
  }, [accent, wallpaper, reduceMotion]);

  // Re-render the command palette labels when sound tracks start/stop
  const [soundTick, setSoundTick] = useState(0);
  useEffect(() => subscribeAudio(() => setSoundTick((t) => t + 1)), []);

  // Reset window drag offset when the focused app or layout changes
  useEffect(() => setWinOffset({ x: 0, y: 0 }), [activeApp, viewMode, windowFull]);

  const handleApiKeyChange = (e) => {
    const key = e.target.value.trim();
    setApiKeys((prev) => ({ ...prev, [aiProvider]: key }));
    saveString('zenflow_openai_key', key);
  };

  // Toast once when the user finishes editing the key — not on every keystroke
  const handleApiKeyBlur = () => {
    const key = apiKeys[aiProvider];
    if (key === keyAtFocusRef.current) return;
    toast({
      title: 'API Key Updated',
      description: key
        ? `${PROVIDERS.find((p) => p.id === aiProvider)?.label} key saved in local storage.`
        : 'API key cleared. Using local mock generator.',
      variant: key ? 'success' : 'info',
    });
  };

  const aiConfig = useMemo(
    () => ({ provider: aiProvider, apiKey: apiKeys[aiProvider] }),
    [aiProvider, apiKeys]
  );

  const openApp = useCallback((appId) => {
    setActiveApp(appId);
    setViewMode('stage');
  }, [setActiveApp, setViewMode]);

  const adoptSchedule = useCallback((items) => {
    const now = Date.now();
    const newTasks = items.map((item, i) => ({
      id: now + i,
      text: `${item.time} — ${item.title}`,
      completed: false,
      priority: item.type === 'focus' ? 'high' : 'low',
      due: null,
      pomodoros: 0,
    }));
    setTasks((prev) => [...newTasks, ...prev]);
    toast({
      title: 'Schedule Adopted',
      description: `${newTasks.length} slots pushed to the task board.`,
      variant: 'success',
    });
  }, [setTasks]);

  // Window dragging (stage mode title bar)
  const dragOriginRef = useRef(null);
  const handleTitleBarPointerDown = (e) => {
    if (e.target.closest('.traffic-light')) return;
    e.preventDefault();
    dragOriginRef.current = { x: e.clientX - winOffset.x, y: e.clientY - winOffset.y };
    const move = (ev) => {
      const o = dragOriginRef.current;
      if (o) setWinOffset({ x: ev.clientX - o.x, y: ev.clientY - o.y });
    };
    const up = () => {
      dragOriginRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Command palette actions
  const commands = useMemo(() => {
    // soundTick ties this memo to audio-engine state, keeping Play/Stop labels fresh
    void soundTick;
    const appCommands = APPS.map((app, i) => ({
      id: `open-${app.id}`,
      label: `Open ${app.title}`,
      hint: `${app.short} · ${i + 1}`,
      icon: app.icon,
      action: () => openApp(app.id),
    }));
    const soundCommands = SOUND_DEFS.map((s) => ({
      id: `sound-${s.id}`,
      label: `${isSoundActive(s.id) ? 'Stop' : 'Play'} ${s.name}`,
      hint: 'sound',
      icon: Music,
      action: () => toggleTrack(s.id),
    }));
    return [
      ...appCommands,
      {
        id: 'toggle-view',
        label: viewMode === 'stage' ? 'Switch to Widget Grid' : 'Switch to Stage Manager',
        hint: 'G',
        icon: Grid,
        action: () => setViewMode(viewMode === 'stage' ? 'grid' : 'stage'),
      },
      {
        id: 'timer-toggle',
        label: timer.running ? 'Pause Timer' : 'Start Timer',
        hint: 'space',
        icon: timer.running ? Pause : Play,
        action: () => (timer.running ? timer.pause() : timer.start()),
      },
      { id: 'timer-reset', label: 'Reset Timer', hint: 'timer', icon: RotateCcw, action: timer.reset },
      { id: 'timer-skip', label: 'Skip to Next Phase', hint: 'timer', icon: SkipForward, action: timer.skip },
      ...soundCommands,
      {
        id: 'settings',
        label: 'Open System Settings',
        hint: 'drawer',
        icon: Settings,
        action: () => setShowControlDrawer(true),
      },
    ];
    // soundTick re-derives the Play/Stop sound labels when tracks toggle
  }, [viewMode, timer, openApp, setViewMode, soundTick]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target;
      const typing =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' || target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (typing || paletteOpen || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key >= '1' && e.key <= String(APPS.length)) {
        openApp(APPS[Number(e.key) - 1].id);
      } else if (e.key.toLowerCase() === 'g') {
        setViewMode(viewMode === 'stage' ? 'grid' : 'stage');
      } else if (e.key === ' ') {
        e.preventDefault();
        if (timer.running) timer.pause();
        else timer.start();
      } else if (e.key === 'Escape') {
        setShowControlDrawer(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode, timer, openApp, setViewMode, paletteOpen]);

  const activeAppDef = APPS.find((a) => a.id === activeApp) || APPS[0];
  const completedCount = tasks.filter((t) => t.completed).length;

  const renderApp = (id) => {
    switch (id) {
      case 'aipal':
        return (
          <AIPal
            ai={aiConfig}
            energy={energyLevel}
            setEnergy={setEnergyLevel}
            tasks={tasks}
            onAdoptSchedule={adoptSchedule}
          />
        );
      case 'wavetimer': return <WaveTimer />;
      case 'soundboard': return <SoundMixer />;
      case 'tasks': return <TaskList tasks={tasks} setTasks={setTasks} onOpenTimer={() => openApp('wavetimer')} />;
      case 'stats': return <StatsApp tasks={tasks} />;
      default: return null;
    }
  };

  return (
    <>
      {/* Top Status Bar */}
      <header className="macos-status-bar">
        <div className="status-bar-left">
          <button
            className="brand-logo"
            onClick={() => setViewMode(viewMode === 'stage' ? 'grid' : 'stage')}
            title="Toggle desktop mode (G)"
          >
            <Sparkles size={15} style={{ color: 'var(--color-cyan)' }} />
            <span>Zenflow OS</span>
          </button>
          <span className="menu-item font-semibold active-app-title" style={{ color: '#fff' }}>
            {activeAppDef.title}
          </span>
          <button className="menu-item" onClick={() => setViewMode('stage')}>Stage Manager</button>
          <button className="menu-item" onClick={() => setViewMode('grid')}>Widget Grid</button>
          <button
            className="menu-item cmdk-hint"
            onClick={() => setPaletteOpen(true)}
            title="Command palette"
          >
            <Command size={11} style={{ marginRight: 3 }} />K
          </button>
        </div>

        <div className="status-bar-right">
          {/* Live timer chip */}
          <TimerChip onOpen={() => openApp('wavetimer')} />

          <div className="status-bar-stat" title="Task completion">
            <CheckCircle2 size={13} style={{ color: 'var(--color-emerald)' }} />
            <span>{completedCount}/{tasks.length} Done</span>
          </div>

          <div className="status-bar-stat hide-on-small" title="Cognitive energy reservoir">
            <Sparkles size={13} style={{ color: 'var(--color-gold)' }} />
            <span>Energy: {energyLevel * 10}%</span>
          </div>

          <Clock />

          <button
            className="settings-toggle"
            onClick={() => setShowControlDrawer(!showControlDrawer)}
            title="System settings"
            aria-expanded={showControlDrawer}
          >
            <Settings size={15} style={{ color: showControlDrawer ? 'var(--color-cyan)' : 'var(--text-secondary)' }} />
            <ChevronDown size={10} style={{ marginLeft: 3, opacity: 0.5 }} />
          </button>
        </div>
      </header>

      {/* Control Center Drawer */}
      {showControlDrawer && (
        <div className="control-drawer">
          <div className="drawer-row" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)', paddingBottom: 10, marginBottom: 14 }}>
            <span className="drawer-label" style={{ fontWeight: 700, color: '#fff' }}>SYSTEM PREFERENCES</span>
          </div>

          <div className="drawer-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
            <span className="drawer-label">COGNITIVE ENERGY RESERVOIR</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="range"
                min="1"
                max="10"
                value={energyLevel}
                onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--color-cyan)' }}
                aria-label="Energy level"
              />
              <span style={{ fontSize: 12, fontWeight: 700, width: 20 }}>{energyLevel}</span>
            </div>
          </div>

          <div className="drawer-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, marginTop: 12 }}>
            <span className="drawer-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <KeyRound size={12} /> AI PROVIDER
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  className={`btn-guide-tab ${aiProvider === p.id ? 'active' : ''}`}
                  onClick={() => { setAiProvider(p.id); saveString('zenflow_ai_provider', p.id); }}
                  style={{ flex: 1 }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="password"
              placeholder={`Paste ${PROVIDERS.find((p) => p.id === aiProvider)?.keyPlaceholder} API key`}
              value={apiKeys[aiProvider]}
              onChange={handleApiKeyChange}
              onFocus={() => { keyAtFocusRef.current = apiKeys[aiProvider]; }}
              onBlur={handleApiKeyBlur}
              className="api-key-input"
              style={{ width: '100%', padding: '8px 10px', fontSize: 11 }}
              aria-label="AI provider API key"
            />
            {apiKeys[aiProvider] && !hasUsableKey(aiProvider, apiKeys[aiProvider]) && (
              <span style={{ fontSize: 10, color: 'var(--color-rose)' }}>
                Key format doesn't match this provider — mock generator will be used.
              </span>
            )}
          </div>

          <div className="drawer-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, marginTop: 12 }}>
            <span className="drawer-label">ACCENT THEME</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  className={`accent-swatch ${accent === a.id ? 'active' : ''}`}
                  style={{ background: a.color }}
                  onClick={() => setAccent(a.id)}
                  title={a.id}
                  aria-label={`${a.id} accent`}
                />
              ))}
            </div>
          </div>

          <div className="drawer-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, marginTop: 12 }}>
            <span className="drawer-label">WALLPAPER</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {WALLPAPERS.map((w) => (
                <button
                  key={w.id}
                  className={`wallpaper-swatch wp-${w.id} ${wallpaper === w.id ? 'active' : ''}`}
                  onClick={() => setWallpaper(w.id)}
                  title={w.label}
                  aria-label={`${w.label} wallpaper`}
                />
              ))}
            </div>
          </div>

          <div className="drawer-row" style={{ marginTop: 12 }}>
            <span className="drawer-label">REDUCE MOTION</span>
            <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
          </div>

          <div className="drawer-row" style={{ marginTop: 8 }}>
            <span className="drawer-label">TIMER NOTIFICATIONS</span>
            <Switch checked={timer.notify} onCheckedChange={timer.setNotify} />
          </div>

          <div className="drawer-row" style={{ marginTop: 8 }}>
            <span className="drawer-label">AUTO-CYCLE FOCUS/BREAKS</span>
            <Switch checked={timer.autoCycle} onCheckedChange={timer.setAutoCycle} />
          </div>
        </div>
      )}

      {/* Desktop Main Frame */}
      <main className="macos-desktop">
        {viewMode === 'stage' ? (
          <div className={`stage-manager-layout ${windowFull ? 'window-full' : ''}`}>
            <aside className="stage-thumbnails">
              {APPS.map((app) => {
                const Icon = app.icon;
                return (
                  <button
                    key={app.id}
                    className={`stage-thumbnail-card ${activeApp === app.id ? 'active-focus' : ''}`}
                    onClick={() => setActiveApp(app.id)}
                  >
                    <div className="stage-thumbnail-header">
                      <Icon size={10} style={{ color: app.color }} />
                      <span>{app.short}</span>
                    </div>
                    <div className="stage-thumbnail-body">
                      {app.id === 'tasks' ? `${completedCount}/${tasks.length} Completed` : app.sub}
                    </div>
                  </button>
                );
              })}
            </aside>

            <section className="stage-active-viewport">
              <div
                className="macos-window"
                style={winOffset.x || winOffset.y ? { transform: `translate(${winOffset.x}px, ${winOffset.y}px)` } : undefined}
              >
                <div
                  className="window-title-bar"
                  onPointerDown={handleTitleBarPointerDown}
                  style={{ cursor: 'grab', touchAction: 'none' }}
                >
                  <div className="window-traffic-lights">
                    <button
                      className="traffic-light traffic-light-close"
                      onClick={() => setViewMode('grid')}
                      title="Close window (back to dashboard)"
                    />
                    <button
                      className="traffic-light traffic-light-min"
                      onClick={() => setWindowFull(false)}
                      title="Restore window size"
                    />
                    <button
                      className="traffic-light traffic-light-max"
                      onClick={() => setWindowFull(!windowFull)}
                      title={windowFull ? 'Exit full screen' : 'Full screen'}
                    />
                  </div>
                  <div className="window-title">{activeAppDef.title}</div>
                  <div className="window-actions" />
                </div>

                <div className="window-body">
                  {renderApp(activeApp)}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="tiled-widget-grid">
            <div className="widget-w4">{renderApp('aipal')}</div>
            <div className="widget-w4">{renderApp('wavetimer')}</div>
            <div className="widget-w4">{renderApp('soundboard')}</div>
            <div className="widget-w4">{renderApp('tasks')}</div>
            <div className="widget-w4">{renderApp('stats')}</div>
          </div>
        )}
      </main>

      {/* Bottom Dock */}
      <footer className="macos-dock-container">
        <div className="macos-dock">
          {APPS.map((app) => {
            const Icon = app.icon;
            return (
              <button
                key={app.id}
                className={`dock-item ${activeApp === app.id && viewMode === 'stage' ? 'active' : ''}`}
                onClick={() => openApp(app.id)}
                aria-label={app.title}
              >
                <Icon size={24} style={{ color: app.color }} />
                <span className="dock-tooltip">
                  {app.id === 'tasks' ? `Tasks (${completedCount})` : app.short}
                </span>
              </button>
            );
          })}

          <div className="dock-divider" />

          <button
            className={`dock-item ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Widget grid"
          >
            <Grid size={24} style={{ color: '#fff' }} />
            <span className="dock-tooltip">Widget Grid</span>
          </button>
        </div>
      </footer>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </>
  );
}

function AppRoot() {
  const [tasks, setTasks] = useState(() => migrateTasks(loadJSON('zenflow_tasks_v1', DEFAULT_TASKS)));

  useEffect(() => saveJSON('zenflow_tasks_v1', tasks), [tasks]);

  // Completed focus session while a task was pinned → count a pomodoro on it
  const handleFocusSessionComplete = useCallback((focusTask) => {
    if (!focusTask) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === focusTask.id ? { ...t, pomodoros: (t.pomodoros || 0) + 1 } : t))
    );
  }, [setTasks]);

  return (
    <TimerProvider onFocusSessionComplete={handleFocusSessionComplete}>
      <AppContent tasks={tasks} setTasks={setTasks} />
    </TimerProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppRoot />
      </ToastProvider>
    </ErrorBoundary>
  );
}

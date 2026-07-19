import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Sparkles, Brain, RefreshCw, Calendar, ListPlus } from 'lucide-react';
import { toast } from './ui/toast';
import { generateScheduleWithAI, hasUsableKey, aiAvailable, probeHosted } from '../lib/ai';
import { loadJSON, saveJSON } from '../lib/storage';

export default function AIPal({ ai, energy = 8, setEnergy, tasks = [], onAdoptSchedule }) {
  const [goals, setGoals] = useState(() => loadJSON('zenflow_coach_goals', ''));
  const [loading, setLoading] = useState(false);
  const [schedule, setScheduleRaw] = useState(() => loadJSON('zenflow_coach_schedule', null));

  const setSchedule = (value) => {
    setScheduleRaw(value);
    saveJSON('zenflow_coach_schedule', value);
  };

  const updateGoals = (value) => {
    setGoals(value);
    saveJSON('zenflow_coach_goals', value);
  };

  const [, setHostedProbed] = useState(false);
  useEffect(() => {
    probeHosted().then(() => setHostedProbed(true));
  }, []);

  const generateSchedule = async () => {
    setLoading(true);
    toast({
      title: 'Analyzing Cognitive State',
      description: `Formulating roadmap for Energy Level ${energy}/10...`,
      variant: 'info',
      duration: 2500,
    });

    const openTasks = tasks.filter((t) => !t.completed).slice(0, 8);

    if (aiAvailable(ai)) {
      try {
        const plan = await generateScheduleWithAI({
          provider: ai.provider,
          apiKey: ai.apiKey,
          energy,
          goals,
          tasks: openTasks,
        });
        if (!Array.isArray(plan) || plan.length === 0) throw new Error('Empty schedule returned');
        setSchedule(plan);
        toast({
          title: 'Focus Roadmap Generated',
          description: `Plan built by ${hasUsableKey(ai?.provider, ai?.apiKey) ? 'GPT' : 'Zenflow Cloud AI'} around your open tasks.`,
          variant: 'success',
        });
      } catch (err) {
        console.error('AI generation failed, falling back to local builder:', err);
        toast({
          title: 'AI Request Failed',
          description: `${err.message || err}`.slice(0, 120),
          variant: 'destructive',
          duration: 4000,
        });
        generateMockSchedule();
      }
    } else {
      // Small delay so the local path still feels like it "thought"
      await new Promise((resolve) => setTimeout(resolve, 900));
      generateMockSchedule();
    }
    setLoading(false);
  };

  const generateMockSchedule = () => {
    const focusGoalText = goals.trim() || 'High priority tasks';
    let plan = [];

    if (energy >= 8) {
      plan = [
        { time: '09:00 AM', title: 'Setup & Admin (Distraction Sweep)', type: 'admin' },
        { time: '09:15 AM', title: `Deep Focus Block: Executing "${focusGoalText}"`, type: 'focus' },
        { time: '10:15 AM', title: 'Biometric Reset: Breathwork & Hydration', type: 'break' },
        { time: '10:30 AM', title: 'Refinement & Secondary Tasks: Polish deliverables', type: 'focus' },
        { time: '11:30 AM', title: 'Review & Inbox Processing', type: 'admin' },
      ];
    } else if (energy >= 5) {
      plan = [
        { time: '09:00 AM', title: 'Alignment & Workspace Calibration', type: 'admin' },
        { time: '09:10 AM', title: `Focus Block 1: "${focusGoalText}" outline`, type: 'focus' },
        { time: '09:40 AM', title: 'Active Rest: stretch & posture check', type: 'break' },
        { time: '09:50 AM', title: 'Focus Block 2: Sub-module coding & debug', type: 'focus' },
        { time: '10:20 AM', title: 'Cognitive cooling break (rest eyes)', type: 'break' },
        { time: '10:30 AM', title: 'Integrations & visual proofing', type: 'focus' },
        { time: '11:00 AM', title: 'Sync roadmap milestones', type: 'admin' },
      ];
    } else {
      plan = [
        { time: '09:00 AM', title: 'Desk Cleansing & Calm Workspace Init', type: 'admin' },
        { time: '09:10 AM', title: 'Micro-Sprint: low-friction checklist tasks', type: 'focus' },
        { time: '09:35 AM', title: 'Extended Rest: hydration & fresh air', type: 'break' },
        { time: '09:55 AM', title: 'Documentation review or low-stress writing', type: 'admin' },
        { time: '10:15 AM', title: 'Guided physical stretching or quiet breathing', type: 'break' },
      ];
    }

    setSchedule(plan);
    toast({
      title: 'Local Roadmap Loaded',
      description: `Generated schedule based on Energy Level ${energy}/10.`,
      variant: 'success',
    });
  };

  const handleReset = () => {
    setSchedule(null);
    updateGoals('');
    toast({
      title: 'State Cleared',
      description: 'Coach reset. Ready to generate a new path.',
      variant: 'info',
    });
  };

  const handleAdopt = () => {
    if (schedule && onAdoptSchedule) onAdoptSchedule(schedule);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'focus': return 'var(--color-cyan)';
      case 'break': return 'var(--color-emerald)';
      case 'admin': return 'var(--color-gold)';
      default: return 'var(--text-muted)';
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'focus': return { color: 'var(--color-cyan)', background: 'rgba(0, 242, 254, 0.08)' };
      case 'break': return { color: 'var(--color-emerald)', background: 'rgba(5, 255, 161, 0.08)' };
      case 'admin': return { color: 'var(--color-gold)', background: 'rgba(255, 214, 68, 0.08)' };
      default: return { color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.03)' };
    }
  };

  const usingOwnKey = hasUsableKey(ai?.provider, ai?.apiKey);
  const providerLabel = usingOwnKey
    ? 'GPT'
    : 'Zenflow Cloud AI';
  const usingAI = aiAvailable(ai);

  return (
    <Card className="aipal-card" glow={true}>
      <CardHeader>
        <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={20} style={{ color: 'var(--color-gold)' }} />
          <span>AI Focus Coach</span>
        </CardTitle>
        <CardDescription>
          Align focus blocks to your energy — {usingAI ? `powered by ${providerLabel}` : 'local mode (add an API key in settings for AI plans)'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!schedule ? (
          <div className="aipal-form" style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.5px' }}>
                COGNITIVE CAPACITY: {energy * 10}%
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {energy >= 8 ? 'High Capacity' : energy >= 5 ? 'Steady State' : 'Low Charge'}
              </span>
            </div>

            <div className="energy-dial">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`btn-energy-node ${energy === val ? 'active' : ''}`}
                  onClick={() => setEnergy(val)}
                  title={`Select energy level ${val}`}
                >
                  {val}
                </button>
              ))}
            </div>

            <textarea
              placeholder="What are your goals for this focus block? (e.g. Code premium dashboard, write documentation, clean inbox...)"
              value={goals}
              onChange={(e) => updateGoals(e.target.value)}
              className="goals-textarea-premium"
            />

            <Button
              onClick={generateSchedule}
              variant="neon-cyan"
              className="w-full"
              style={{ width: '100%', display: 'flex', gap: 8, height: 42 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="spinner" />
                  Calibrating Neural Pathway...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate Focus Roadmap
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="aipal-schedule-view" style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} style={{ color: 'var(--color-cyan)' }} />
                Your Focus Path
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button onClick={handleAdopt} variant="glass" size="sm" style={{ height: 26, padding: '0 10px', fontSize: 11 }} title="Add these slots to the task board">
                  <ListPlus size={11} style={{ marginRight: 4 }} /> To Board
                </Button>
                <Button onClick={handleReset} variant="outline" size="sm" style={{ height: 26, padding: '0 10px' }}>
                  <RefreshCw size={11} style={{ marginRight: 4 }} /> Adjust
                </Button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {schedule.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                  {idx < schedule.length - 1 && (
                    <div style={{
                      position: 'absolute', left: '8px', top: '16px', bottom: '-14px',
                      width: '2px', background: 'rgba(255,255,255,0.06)',
                    }} />
                  )}

                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'rgba(10,12,20,0.8)',
                    border: `2px solid ${getTypeColor(item.type)}`,
                    boxShadow: `0 0 8px ${getTypeColor(item.type)}`,
                    zIndex: 2, marginTop: '2px', flexShrink: 0,
                  }} />

                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.time}</span>
                      <span style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 20, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        ...getBadgeStyle(item.type),
                      }}>
                        {item.type}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{item.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Volume2, VolumeX, CloudRain, Radio, Compass, Flame, Waves, Wind, Music, Save, X } from 'lucide-react';
import { toast } from './ui/toast';
import {
  SOUND_DEFS, getState, subscribe, toggleTrack, setTrackVolume,
  setMasterVolume, getAnalyser, getPresets, savePreset, deletePreset, applyPreset,
} from '../lib/audioEngine';

const TRACK_ICONS = {
  rain: CloudRain,
  drone: Radio,
  space: Compass,
  lofi: Flame,
  ocean: Waves,
  wind: Wind,
};

export default function SoundMixer() {
  // Audio lives in the module-level engine, so sounds keep playing when this
  // component unmounts (switching apps/views). The component is just a remote.
  const [mix, setMix] = useState(getState);
  const [presets, setPresets] = useState(getPresets);
  const [presetName, setPresetName] = useState('');

  const canvasRefs = useRef({});
  const frameRefs = useRef({});

  useEffect(() => subscribe(setMix), []);

  const handleToggle = (id) => {
    const nowActive = toggleTrack(id);
    const def = SOUND_DEFS.find((s) => s.id === id);
    toast({
      title: nowActive ? `${def.name} Active` : `${def.name} Silenced`,
      description: nowActive ? 'Procedural soundscape synthesizing live.' : 'Audio node released.',
      variant: nowActive ? 'success' : 'info',
      duration: 2000,
    });
  };

  const drawFlatline = (id) => {
    const canvas = canvasRefs.current[id];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rect.height / 2);
    ctx.lineTo(rect.width, rect.height / 2);
    ctx.stroke();
  };

  // Drive visualizers from engine state (also picks up tracks that were
  // already playing when this component mounted).
  useEffect(() => {
    const frames = frameRefs.current;
    SOUND_DEFS.forEach((def) => {
      const { id, color } = def;
      const active = mix.tracks[id]?.active;
      const canvas = canvasRefs.current[id];
      if (!canvas) return;

      if (!active) {
        if (frameRefs.current[id]) {
          cancelAnimationFrame(frameRefs.current[id]);
          frameRefs.current[id] = null;
        }
        drawFlatline(id);
        return;
      }
      if (frameRefs.current[id]) return; // already animating

      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const draw = () => {
        const analyser = getAnalyser(id);
        if (!analyser) {
          frameRefs.current[id] = null;
          drawFlatline(id);
          return;
        }
        frameRefs.current[id] = requestAnimationFrame(draw);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, rect.width, rect.height);
        // Canvas can't resolve CSS variables — use the resolved hex from SOUND_DEFS
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        const sliceWidth = rect.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * rect.height) / 2.5;
          if (i === 0) ctx.moveTo(x, rect.height - y);
          else ctx.lineTo(x, rect.height - y);
          x += sliceWidth;
        }
        ctx.lineTo(rect.width, rect.height / 2);
        ctx.stroke();
      };
      draw();
    });

    return () => {
      Object.keys(frames).forEach((id) => {
        if (frames[id]) {
          cancelAnimationFrame(frames[id]);
          frames[id] = null;
        }
      });
    };
  }, [mix]);

  const handleSavePreset = (e) => {
    e.preventDefault();
    const name = presetName.trim();
    if (!name) return;
    setPresets({ ...savePreset(name) });
    setPresetName('');
    toast({ title: 'Mix Saved', description: `Preset "${name}" stored.`, variant: 'success', duration: 2000 });
  };

  const handleApplyPreset = (name) => {
    applyPreset(name);
    toast({ title: 'Mix Applied', description: `Preset "${name}" loaded.`, variant: 'info', duration: 2000 });
  };

  const handleDeletePreset = (name) => {
    setPresets({ ...deletePreset(name) });
    toast({ title: 'Preset Removed', description: `"${name}" deleted.`, variant: 'destructive', duration: 2000 });
  };

  const anyActive = SOUND_DEFS.some((s) => mix.tracks[s.id]?.active);
  const presetNames = Object.keys(presets);

  return (
    <Card className="sound-mixer-card" glow={anyActive} hoverEffect={true}>
      <CardHeader>
        <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Music size={20} style={{ color: 'var(--color-purple)' }} />
          <span>Procedural Synthesizer</span>
        </CardTitle>
        <CardDescription>
          Soundscapes keep playing while you work in any app
        </CardDescription>
      </CardHeader>

      <CardContent className="sound-mixer-panel">
        {/* Master volume */}
        <div className="sound-master-row">
          <span className="sound-master-label">MASTER</span>
          <VolumeX size={12} style={{ opacity: 0.5 }} />
          <Slider
            value={[mix.master]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={([val]) => setMasterVolume(val)}
            style={{ flex: 1 }}
          />
          <Volume2 size={12} style={{ opacity: 0.5 }} />
          <span className="sound-master-pct">{Math.round(mix.master * 100)}%</span>
        </div>

        {SOUND_DEFS.map((def) => {
          const Icon = TRACK_ICONS[def.id] || Music;
          const track = mix.tracks[def.id];
          return (
            <div key={def.id} className={`sound-track-card ${track.active ? 'active' : ''}`}>
              <div className="sound-track-header">
                <div className="sound-track-title">
                  <Icon size={16} style={{ color: track.active ? def.color : 'var(--text-muted)' }} />
                  <span>{def.name}</span>
                </div>

                <div className="sound-track-canvas-container">
                  <canvas
                    ref={(el) => { canvasRefs.current[def.id] = el; }}
                    className="sound-track-canvas"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>

                <Switch
                  checked={track.active}
                  onCheckedChange={() => handleToggle(def.id)}
                  aria-label={`Toggle ${def.name}`}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <VolumeX size={12} style={{ opacity: 0.5 }} />
                <Slider
                  value={[track.volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={([val]) => setTrackVolume(def.id, val)}
                  style={{ flex: 1 }}
                  disabled={!track.active}
                />
                <Volume2 size={12} style={{ opacity: 0.5 }} />
              </div>
            </div>
          );
        })}

        {/* Presets */}
        <div className="sound-presets-block">
          <span className="drawer-label" style={{ display: 'block', marginBottom: 8 }}>MIX PRESETS</span>
          {presetNames.length > 0 && (
            <div className="sound-preset-chips">
              {presetNames.map((name) => (
                <span key={name} className="sound-preset-chip">
                  <button className="sound-preset-apply" onClick={() => handleApplyPreset(name)} title={`Apply "${name}"`}>
                    {name}
                  </button>
                  <button className="sound-preset-delete" onClick={() => handleDeletePreset(name)} title={`Delete "${name}"`} aria-label={`Delete preset ${name}`}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <form onSubmit={handleSavePreset} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Name this mix (e.g. Deep Work)"
              className="goals-textarea-premium"
              style={{ margin: 0, height: 32, padding: '0 10px', fontSize: 11, flex: 1 }}
            />
            <Button type="submit" variant="glass" style={{ height: 32, padding: '0 12px', fontSize: 11 }}>
              <Save size={12} style={{ marginRight: 5 }} /> Save
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

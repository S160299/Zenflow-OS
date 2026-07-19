import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';

// ⌘K command palette. `commands` is [{ id, label, hint, icon: Component, action }].
export default function CommandPalette({ open, onClose, commands }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.hint || '').toLowerCase().includes(q)
    );
  }, [query, commands]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => setSelected(0), [query]);

  useEffect(() => {
    const el = listRef.current?.children[selected];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  const run = (cmd) => {
    onClose();
    cmd.action();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && filtered[selected]) {
      e.preventDefault();
      run(filtered[selected]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="cmdk-overlay" onClick={onClose} role="dialog" aria-label="Command palette">
      <div className="cmdk-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-input-row">
          <Search size={15} style={{ opacity: 0.5, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command… (apps, timer, sounds)"
            className="cmdk-input"
            aria-label="Search commands"
          />
          <kbd className="cmdk-kbd">esc</kbd>
        </div>
        <div className="cmdk-list" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="cmdk-empty">No matching commands</div>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  className={`cmdk-item ${i === selected ? 'selected' : ''}`}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => run(cmd)}
                >
                  {Icon && <Icon size={15} style={{ flexShrink: 0, opacity: 0.8 }} />}
                  <span className="cmdk-item-label">{cmd.label}</span>
                  {cmd.hint && <span className="cmdk-item-hint">{cmd.hint}</span>}
                  {i === selected && <CornerDownLeft size={12} style={{ opacity: 0.4 }} />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

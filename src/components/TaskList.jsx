import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Badge } from './ui/badge';
import {
  ListTodo, Plus, Trash, Check, Crosshair, Pencil,
  GripVertical, CalendarDays, Timer as TimerIcon, Eraser,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from './ui/toast';
import { playChime } from '../lib/audioEngine';
import { recordTaskCompleted } from '../lib/stats';
import { useTimer } from '../context/TimerContext';

const PRIORITIES = ['low', 'med', 'high'];
const PRIORITY_STYLE = {
  high: { color: 'var(--color-rose)', background: 'rgba(255, 42, 127, 0.1)' },
  med: { color: 'var(--color-gold)', background: 'rgba(255, 214, 68, 0.1)' },
  low: { color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)' },
};
const FILTERS = ['all', 'active', 'done'];

function isOverdue(due) {
  if (!due) return false;
  const end = new Date(`${due}T23:59:59`);
  return end.getTime() < Date.now();
}

export default function TaskList({ tasks = [], setTasks, onOpenTimer }) {
  const timer = useTimer();
  const [inputText, setInputText] = useState('');
  const [inputPriority, setInputPriority] = useState('med');
  const [inputDue, setInputDue] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [dragId, setDragId] = useState(null);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const newTask = {
      id: Date.now(),
      text: inputText.trim(),
      completed: false,
      priority: inputPriority,
      due: inputDue || null,
      pomodoros: 0,
    };
    setTasks((prev) => [newTask, ...prev]);
    setInputText('');
    setInputDue('');
    toast({
      title: 'Task Logged',
      description: `"${newTask.text}" added to focus board.`,
      variant: 'success',
      duration: 2000,
    });
  };

  const handleToggleTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const nextCompleted = !task.completed;
    if (nextCompleted) {
      playChime();
      recordTaskCompleted();
      if (timer.focusTask?.id === id) timer.setFocusTask(null);
      toast({ title: 'Task Complete!', description: `"${task.text}" finished. Great focus!`, variant: 'success' });
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: nextCompleted } : t)));
  };

  const handleDeleteTask = (id, text) => {
    if (timer.focusTask?.id === id) timer.setFocusTask(null);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast({ title: 'Task Deleted', description: `"${text}" removed.`, variant: 'destructive', duration: 2000 });
  };

  const cyclePriority = (id) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = PRIORITIES[(PRIORITIES.indexOf(t.priority || 'med') + 1) % PRIORITIES.length];
        return { ...t, priority: next };
      })
    );
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditText(task.text);
  };

  const commitEdit = () => {
    const text = editText.trim();
    if (text) {
      setTasks((prev) => prev.map((t) => (t.id === editingId ? { ...t, text } : t)));
    }
    setEditingId(null);
  };

  const handleFocusOn = (task) => {
    if (timer.focusTask?.id === task.id) {
      timer.setFocusTask(null);
      toast({ title: 'Focus Cleared', description: 'Timer unpinned from task.', variant: 'info', duration: 2000 });
      return;
    }
    timer.setFocusTask(task);
    toast({
      title: 'Focus Locked',
      description: `Timer pinned to "${task.text}". Completed focus sessions will count toward it.`,
      variant: 'success',
      duration: 3000,
    });
    onOpenTimer?.();
  };

  const clearCompleted = () => {
    const count = tasks.filter((t) => t.completed).length;
    if (!count) return;
    setTasks((prev) => prev.filter((t) => !t.completed));
    toast({ title: 'Board Cleared', description: `${count} completed task${count > 1 ? 's' : ''} removed.`, variant: 'info', duration: 2000 });
  };

  const handleDragOver = (e, overId) => {
    e.preventDefault();
    if (dragId === null || dragId === overId) return;
    setTasks((prev) => {
      const list = [...prev];
      const from = list.findIndex((t) => t.id === dragId);
      const to = list.findIndex((t) => t.id === overId);
      if (from === -1 || to === -1) return prev;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return list;
    });
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const visible = tasks.filter((t) =>
    filter === 'all' ? true : filter === 'active' ? !t.completed : t.completed
  );

  return (
    <Card className="task-card" glow={completedCount > 0} hoverEffect={true}>
      <CardHeader style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ListTodo size={20} style={{ color: 'var(--color-emerald)' }} />
            <span>Holographic Task Board</span>
          </CardTitle>
          <CardDescription>
            Prioritize, schedule, and clear high-impact focus items
          </CardDescription>
        </div>
        <Badge variant="secondary">
          {completedCount} / {tasks.length} Done
        </Badge>
      </CardHeader>

      <CardContent>
        {/* Add form */}
        <form onSubmit={handleAddTask} className="task-add-form">
          <Input
            type="text"
            placeholder="Add a high-impact focus item..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="task-add-input"
            aria-label="New task"
          />
          <Select value={inputPriority} onValueChange={setInputPriority}>
            <SelectTrigger className="task-add-select" aria-label="Priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="med">Med</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="task-add-date" aria-label="Due date">
                <CalendarDays size={13} style={{ marginRight: 6, flexShrink: 0 }} />
                {inputDue ? format(new Date(`${inputDue}T00:00:00`), 'MMM d') : 'Due date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={inputDue ? new Date(`${inputDue}T00:00:00`) : undefined}
                onSelect={(date) => setInputDue(date ? format(date, 'yyyy-MM-dd') : '')}
                autoFocus
              />
            </PopoverContent>
          </Popover>
          <Button type="submit" variant="neon-cyan" style={{ height: 38, width: 44, padding: 0 }} aria-label="Add task">
            <Plus size={18} />
          </Button>
        </form>

        {/* Filter tabs */}
        <div className="task-filter-row">
          <div className="task-filter-tabs">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`btn-guide-tab ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? `All (${tasks.length})` : f === 'active' ? `Active (${tasks.length - completedCount})` : `Done (${completedCount})`}
              </button>
            ))}
          </div>
          {completedCount > 0 && (
            <button className="task-clear-btn" onClick={clearCompleted} title="Remove all completed tasks">
              <Eraser size={11} style={{ marginRight: 4 }} /> Clear done
            </button>
          )}
        </div>

        <div className="task-capsule-list">
          {visible.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>
              {tasks.length === 0
                ? 'No tasks logged. Add an item above to begin focusing.'
                : filter === 'done' ? 'Nothing completed yet — go crush a task!' : 'All clear here. Nice work!'}
            </div>
          ) : (
            visible.map((task) => {
              const focused = timer.focusTask?.id === task.id;
              const overdue = !task.completed && isOverdue(task.due);
              return (
                <div
                  key={task.id}
                  className={`task-capsule-item ${task.completed ? 'completed' : ''} ${focused ? 'focused' : ''}`}
                  draggable={editingId !== task.id}
                  onDragStart={() => setDragId(task.id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                >
                  <span className="task-drag-handle" title="Drag to reorder">
                    <GripVertical size={13} />
                  </span>

                  <div
                    className="task-checkbox-container"
                    onClick={() => editingId !== task.id && handleToggleTask(task.id)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && editingId !== task.id) {
                        e.preventDefault();
                        handleToggleTask(task.id);
                      }
                    }}
                    role="checkbox"
                    aria-checked={task.completed}
                    tabIndex={0}
                  >
                    <span className="task-bullet-check">
                      {task.completed && <Check size={11} style={{ color: '#030406', strokeWidth: 3 }} />}
                    </span>
                    {editingId === task.id ? (
                      <input
                        className="task-edit-input"
                        value={editText}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className="task-capsule-text" onDoubleClick={() => startEditing(task)}>
                        {task.text}
                      </span>
                    )}
                  </div>

                  <div className="task-badges">
                    <button
                      className="task-priority-chip"
                      style={PRIORITY_STYLE[task.priority || 'med']}
                      onClick={() => cyclePriority(task.id)}
                      title="Click to cycle priority"
                    >
                      {(task.priority || 'med').toUpperCase()}
                    </button>
                    {task.due && (
                      <span className={`task-due-chip ${overdue ? 'overdue' : ''}`} title={overdue ? 'Overdue!' : 'Due date'}>
                        <CalendarDays size={9} style={{ marginRight: 3 }} />
                        {new Date(`${task.due}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {task.pomodoros > 0 && (
                      <span className="task-pomo-chip" title={`${task.pomodoros} focus session${task.pomodoros > 1 ? 's' : ''} completed on this task`}>
                        <TimerIcon size={9} style={{ marginRight: 3 }} />
                        {task.pomodoros}
                      </span>
                    )}
                  </div>

                  <div className="task-actions">
                    {!task.completed && (
                      <button
                        className={`btn-task-action ${focused ? 'active-focus-btn' : ''}`}
                        onClick={() => handleFocusOn(task)}
                        title={focused ? 'Unpin timer from this task' : 'Focus timer on this task'}
                      >
                        <Crosshair size={14} />
                      </button>
                    )}
                    <button className="btn-task-action" onClick={() => startEditing(task)} title="Edit task">
                      <Pencil size={13} />
                    </button>
                    <button className="btn-task-action" onClick={() => handleDeleteTask(task.id, task.text)} title="Delete task">
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

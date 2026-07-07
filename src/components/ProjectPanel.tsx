import { useState } from 'react';
import type { Project, CreateProjectInput, ProjectStatus } from '../db/types';

const STATUS_ORDER: ProjectStatus[] = ['planned','in_progress','paused','completed','ready_to_wear'];
const STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: 'Planned', in_progress: 'In Progress', paused: 'Paused',
  completed: 'Completed', ready_to_wear: 'Ready to Wear',
};
const STATUS_COLORS: Record<ProjectStatus, string> = {
  planned: '#d5e8f5', in_progress: '#d5f5e8', paused: '#f5ead5',
  completed: '#e8d5f5', ready_to_wear: '#f5d5ea',
};

interface Props {
  project: Project | null;
  onSave: (input: CreateProjectInput) => Promise<void>;
  onStatusAction?: (action: 'start' | 'pause' | 'complete') => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

function toInput(p: Project): CreateProjectInput {
  return {
    title: p.title, status: p.status, priority: p.priority,
    startDate: p.start_date ?? undefined,
    processNotes: p.process_notes ?? undefined, isSample: !!p.is_sample,
    plannerStartDate: p.planner_start_date ?? undefined,
    plannerEndDate: p.planner_end_date ?? undefined,
  };
}

const EMPTY: CreateProjectInput = { title: '', status: 'planned', priority: 0, isSample: false };

export default function ProjectPanel({ project, onSave, onStatusAction, onDelete, onClose }: Props) {
  const isNew = project === null;
  const [mode, setMode]         = useState<'view' | 'edit'>(isNew ? 'edit' : 'view');
  const [form, setForm]         = useState<CreateProjectInput>(project ? toInput(project) : EMPTY);
  const [saving, setSaving]     = useState(false);
  const [actioning, setActioning] = useState(false);
  const [error, setError]       = useState('');

  const set = (field: keyof CreateProjectInput, value: unknown) =>
    setForm(f => ({ ...f, [field]: value === '' ? undefined : value }));

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try {
      await onSave(form);
      if (!isNew) setMode('view');
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const doAction = async (action: 'start' | 'pause' | 'complete') => {
    if (!onStatusAction) return;
    setActioning(true);
    try { await onStatusAction(action); }
    finally { setActioning(false); }
  };

  // Which lifecycle actions are available for the current status?
  const status = project?.status;
  const canStart    = status === 'planned' || status === 'paused';
  const canPause    = status === 'in_progress';
  const canComplete = status === 'in_progress' || status === 'paused';

  const renderView = () => {
    if (!project) return null;
    const s = project.status;

    // Planned dates are only shown when the project hasn't started yet, or when paused
    // (so the user can review/adjust the plan before resuming).
    const showPlannerDates = s === 'planned' || s === 'paused';
    // Actual start date is only meaningful once the project is underway or done.
    const showStartDate    = s === 'in_progress' || s === 'paused' || s === 'completed' || s === 'ready_to_wear';
    const showEndDate      = s === 'completed' || s === 'ready_to_wear';

    const rows: [string, React.ReactNode][] = [
      ['Status', <span key="s" style={{ background: STATUS_COLORS[s] ?? '#eee', padding: '2px 10px', borderRadius: 6, fontWeight: 600, fontSize: 13 }}>{STATUS_LABELS[s] ?? s}</span>],
      ['Priority',      project.priority ? `${project.priority}` : null],
      ...(showPlannerDates ? [
        ['Planned Start', project.planner_start_date] as [string, React.ReactNode],
        ['Planned End',   project.planner_end_date]   as [string, React.ReactNode],
      ] : []),
      ...(showStartDate ? [['Start Date', project.start_date] as [string, React.ReactNode]] : []),
      ...(showEndDate   ? [['End Date',   project.end_date]   as [string, React.ReactNode]] : []),
      ['Sample',        project.is_sample ? 'Yes (swatch only)' : null],
      ['Process Notes', project.process_notes],
    ];

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        <h2 style={{ margin: '20px 0 16px', fontSize: 26, fontWeight: 800, color: '#1a1a2e' }}>
          {project.title}
        </h2>

        {/* ── Lifecycle actions ── */}
        {(canStart || canPause || canComplete) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {canStart && (
              <button
                onClick={() => doAction('start')}
                disabled={actioning}
                style={{ ...actionBtn, background: '#2ecc71', borderColor: '#27ae60' }}
              >
                ▶ {status === 'paused' ? 'Resume Project' : 'Start Project'}
              </button>
            )}
            {canPause && (
              <button
                onClick={() => doAction('pause')}
                disabled={actioning}
                style={{ ...actionBtn, background: '#f39c12', borderColor: '#d68910' }}
              >
                ⏸ Pause Project
              </button>
            )}
            {canComplete && (
              <button
                onClick={() => doAction('complete')}
                disabled={actioning}
                style={{ ...actionBtn, background: '#8e44ad', borderColor: '#7d3c98' }}
              >
                ✓ Complete Project
              </button>
            )}
          </div>
        )}

        {/* Properties */}
        {rows.map(([label, val]) => val == null ? null : (
          <div key={label} style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid #f0ebfa' }}>
            <span style={{ width: 140, flexShrink: 0, fontSize: 13, color: '#999', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ opacity: 0.5, fontSize: 11 }}>≡</span> {label}
            </span>
            <span style={{ fontSize: 13, color: '#1a1a2e' }}>{val}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderEdit = () => (
    <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Title *">
        <input style={inputS} value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Status">
          <select style={inputS} value={form.status ?? 'planned'} onChange={e => set('status', e.target.value as ProjectStatus)}>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <input style={inputS} type="number" min={0} max={10} value={form.priority ?? 0}
            onChange={e => set('priority', parseInt(e.target.value) || 0)} />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Planner Start">
          <input style={inputS} type="date" value={form.plannerStartDate ?? ''}
            onChange={e => set('plannerStartDate', e.target.value)} />
        </Field>
        <Field label="Planner End">
          <input style={inputS} type="date" value={form.plannerEndDate ?? ''}
            onChange={e => set('plannerEndDate', e.target.value)} />
        </Field>
      </div>

      <Field label="Process Notes">
        <textarea style={{ ...inputS, height: 80, resize: 'vertical' }} value={form.processNotes ?? ''}
          onChange={e => set('processNotes', e.target.value)} />
      </Field>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!form.isSample} onChange={e => set('isSample', e.target.checked)} />
        <span>This is a sample / swatch only (won't become a Garment)</span>
      </label>

      {error && <div style={{ color: '#c0392b', fontSize: 12 }}>{error}</div>}
    </form>
  );

  return (
    <div style={{
      width: 380, flexShrink: 0, borderLeft: '1px solid #e5dff0',
      background: '#fff', display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', borderBottom: '1px solid #e5dff0', flexShrink: 0,
      }}>
        {!isNew && mode === 'view' && (
          <button onClick={() => setMode('edit')} style={ghostBtn}>Edit</button>
        )}
        {mode === 'edit' && !isNew && (
          <button onClick={() => { setMode('view'); setForm(toInput(project!)); setError(''); }} style={ghostBtn}>
            Cancel
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {onDelete && mode === 'view' && (
            <button onClick={onDelete} style={{ ...ghostBtn, color: '#c0392b', borderColor: '#c0392b' }}>Delete</button>
          )}
          <button onClick={onClose} style={iconBtn}>✕</button>
        </div>
      </div>

      {mode === 'view' ? renderView() : renderEdit()}

      {mode === 'edit' && (
        <div style={{
          padding: '12px 16px', borderTop: '1px solid #e5dff0',
          display: 'flex', gap: 8, background: '#fff', flexShrink: 0,
        }}>
          <button type="button" onClick={handleSubmit} disabled={saving} style={primaryBtn}>
            {saving ? 'Saving…' : project ? 'Save Changes' : 'Create Project'}
          </button>
          {isNew && <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#7c5cbf', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputS: React.CSSProperties = {
  padding: '6px 8px', border: '1px solid #d8d0ea', borderRadius: 6,
  fontSize: 13, background: '#faf8fd', outline: 'none', width: '100%', boxSizing: 'border-box',
};
const primaryBtn: React.CSSProperties = {
  padding: '7px 16px', background: '#7c5cbf', color: '#fff',
  border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const ghostBtn: React.CSSProperties = {
  padding: '6px 12px', background: 'transparent', color: '#555',
  border: '1px solid #d8d0ea', borderRadius: 6, fontSize: 13, cursor: 'pointer',
};
const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 16, color: '#999', lineHeight: 1, padding: 4,
};
const actionBtn: React.CSSProperties = {
  padding: '7px 14px', color: '#fff', border: '1px solid transparent',
  borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

import { useEffect, useState } from 'react';
import { listProjects, createProject, updateProject, deleteProject } from '../db/projects';
import { createGarment } from '../db/garments';
import type { Project, CreateProjectInput, ProjectStatus } from '../db/types';
import ProjectPanel from '../components/ProjectPanel';
import type { NavigateOpts } from '../App';
import type { NavSection } from '../nav';

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
  initialProjectId?: string;
  onNavigate?: (section: NavSection, opts?: NavigateOpts) => void;
}

export default function ProjectView({ initialProjectId, onNavigate }: Props) {
  const [projects, setProjects]   = useState<Project[]>([]);
  const [selected, setSelected]   = useState<Project | null | 'new'>(null);
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | ''>('');
  const [search, setSearch]       = useState('');

  const load = async () => {
    const all = await listProjects();
    setProjects(all);
    return all;
  };

  // On mount: load projects, then open initialProjectId if provided
  useEffect(() => {
    load().then(all => {
      if (initialProjectId) {
        const match = all.find(p => p.id === initialProjectId);
        if (match) setSelected(match);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId]);

  const visible = projects.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = async (input: CreateProjectInput) => {
    if (selected === 'new') {
      await createProject(input);
    } else if (selected) {
      await updateProject((selected as Project).id, input);
    }
    setSelected(null);
    await load();
  };

  const today = () => new Date().toISOString().slice(0, 10);

  const handleStatusAction = async (action: 'start' | 'pause' | 'complete') => {
    if (!selected || selected === 'new') return;
    const p = selected as Project;
    const patch =
      action === 'start'    ? { status: 'in_progress' as ProjectStatus, startDate: today() } :
      action === 'pause'    ? { status: 'paused'      as ProjectStatus } :
      /* complete */          { status: 'completed'   as ProjectStatus, endDate: today() };
    const updated = await updateProject(p.id, patch);
    setSelected(updated);
    await load();

    if (action === 'complete') {
      const garment = await createGarment({ projectId: p.id });
      onNavigate?.('garment', { garmentId: garment.id });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    await deleteProject(id);
    setSelected(null);
    await load();
  };

  const isSelected = (p: Project) => selected !== 'new' && (selected as Project)?.id === p.id;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px',
          borderBottom: '1px solid #e5dff0', background: '#fff', flexShrink: 0,
        }}>
          <input
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inputStyle}
          />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ProjectStatus | '')} style={inputStyle}>
            <option value="">All statuses</option>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button onClick={() => setSelected('new')} style={primaryBtn}>+ New Project</button>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f3eefb', position: 'sticky', top: 0, zIndex: 1 }}>
                {['Title','Status','Start','Priority'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#999' }}>No projects found</td></tr>
              )}
              {visible.map(p => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  style={{
                    cursor: 'pointer',
                    background: isSelected(p) ? '#f0ebfa' : 'transparent',
                    borderBottom: '1px solid #ede8f5',
                  }}
                  onMouseEnter={e => { if (!isSelected(p)) (e.currentTarget as HTMLElement).style.background = '#faf8fd'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected(p) ? '#f0ebfa' : 'transparent'; }}
                >
                  <td style={tdStyle}><strong>{p.title}</strong></td>
                  <td style={tdStyle}>
                    <span style={{
                      background: STATUS_COLORS[p.status], padding: '2px 8px',
                      borderRadius: 10, fontSize: 11, fontWeight: 600,
                    }}>{STATUS_LABELS[p.status]}</span>
                  </td>
                  <td style={tdStyle}>{p.start_date ?? '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{p.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '8px 24px', fontSize: 12, color: '#999', borderTop: '1px solid #e5dff0', background: '#fff' }}>
          {visible.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
        </div>
      </div>

      {selected !== null && (
        <ProjectPanel
          project={selected === 'new' ? null : selected as Project}
          onSave={handleSave}
          onStatusAction={handleStatusAction}
          onDelete={selected !== 'new' ? () => handleDelete((selected as Project).id) : undefined}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', border: '1px solid #d8d0ea', borderRadius: 6,
  fontSize: 13, background: '#faf8fd', outline: 'none',
};
const primaryBtn: React.CSSProperties = {
  marginLeft: 'auto', padding: '6px 14px', background: '#7c5cbf', color: '#fff',
  border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const thStyle: React.CSSProperties = {
  padding: '8px 16px', textAlign: 'left', fontSize: 11,
  fontWeight: 600, color: '#7c5cbf', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '2px solid #e5dff0',
};
const tdStyle: React.CSSProperties = { padding: '10px 16px', verticalAlign: 'middle' };

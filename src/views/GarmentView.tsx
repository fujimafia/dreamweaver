import { useEffect, useState } from 'react';
import { listGarments, updateGarment, deleteGarment } from '../db/garments';
import { getProject } from '../db/projects';
import type { Garment, UpdateGarmentInput } from '../db/types';
import GarmentPanel from '../components/GarmentPanel';

interface Props {
  initialGarmentId?: string;
}

export default function GarmentView({ initialGarmentId }: Props) {
  const [garments, setGarments]     = useState<Garment[]>([]);
  const [titles, setTitles]         = useState<Record<string, string>>({});
  const [selected, setSelected]     = useState<Garment | null>(null);
  const [search, setSearch]         = useState('');

  const load = async () => {
    const all = await listGarments();
    setGarments(all);
    // Fetch project titles for display
    const titleMap: Record<string, string> = {};
    await Promise.all(all.map(async g => {
      const p = await getProject(g.project_id);
      if (p) titleMap[g.id] = p.title;
    }));
    setTitles(titleMap);
    return all;
  };

  useEffect(() => {
    load().then(all => {
      if (initialGarmentId) {
        const match = all.find(g => g.id === initialGarmentId);
        if (match) setSelected(match);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGarmentId]);

  const visible = garments.filter(g => {
    if (!search) return true;
    const q = search.toLowerCase();
    const title = (titles[g.id] ?? '').toLowerCase();
    return title.includes(q) ||
      (g.garment_type ?? '').toLowerCase().includes(q) ||
      (g.season ?? '').toLowerCase().includes(q);
  });

  const handleSave = async (input: UpdateGarmentInput) => {
    if (!selected) return;
    const updated = await updateGarment(selected.id, input);
    setSelected(updated);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this garment?')) return;
    await deleteGarment(id);
    setSelected(null);
    await load();
  };

  const isSelected = (g: Garment) => selected?.id === g.id;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px',
          borderBottom: '1px solid #e5dff0', background: '#fff', flexShrink: 0,
        }}>
          <input
            placeholder="Search garments…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f3eefb', position: 'sticky', top: 0, zIndex: 1 }}>
                {['Project', 'Type', 'Season', 'Gift', 'Care'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#999' }}>No garments yet</td></tr>
              )}
              {visible.map(g => (
                <tr
                  key={g.id}
                  onClick={() => setSelected(g)}
                  style={{
                    cursor: 'pointer',
                    background: isSelected(g) ? '#f0ebfa' : 'transparent',
                    borderBottom: '1px solid #ede8f5',
                  }}
                  onMouseEnter={e => { if (!isSelected(g)) (e.currentTarget as HTMLElement).style.background = '#faf8fd'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected(g) ? '#f0ebfa' : 'transparent'; }}
                >
                  <td style={tdStyle}><strong>{titles[g.id] ?? '—'}</strong></td>
                  <td style={tdStyle}>{g.garment_type ?? '—'}</td>
                  <td style={tdStyle}>{g.season ?? '—'}</td>
                  <td style={tdStyle}>{g.is_gift ? '🎁 Yes' : 'No'}</td>
                  <td style={tdStyle}>{g.care_instructions ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '8px 24px', fontSize: 12, color: '#999', borderTop: '1px solid #e5dff0', background: '#fff' }}>
          {visible.length} of {garments.length} garment{garments.length !== 1 ? 's' : ''}
        </div>
      </div>

      {selected && (
        <GarmentPanel
          garment={selected}
          projectTitle={titles[selected.id]}
          onSave={handleSave}
          onDelete={() => handleDelete(selected.id)}
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
const thStyle: React.CSSProperties = {
  padding: '8px 16px', textAlign: 'left', fontSize: 11,
  fontWeight: 600, color: '#7c5cbf', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '2px solid #e5dff0',
};
const tdStyle: React.CSSProperties = { padding: '10px 16px', verticalAlign: 'middle' };

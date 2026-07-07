import { useEffect, useState } from 'react';
import { listYarns, createYarn, updateYarn, deleteYarn } from '../db/yarns';
import type { Yarn, CreateYarnInput, YarnWeight } from '../db/types';
import YarnPanel from '../components/YarnPanel';

const WEIGHT_ORDER: YarnWeight[] = ['lace','fingering','sport','dk','worsted','aran','bulky','super_bulky'];

const WEIGHT_LABELS: Record<YarnWeight, string> = {
  lace: 'Lace', fingering: 'Fingering', sport: 'Sport', dk: 'DK',
  worsted: 'Worsted', aran: 'Aran', bulky: 'Bulky', super_bulky: 'Super Bulky',
};

const WEIGHT_COLORS: Record<YarnWeight, string> = {
  lace: '#e8d5f5', fingering: '#d5e8f5', sport: '#d5f5e8',
  dk: '#f5ead5', worsted: '#f5d5d5', aran: '#d5d5f5',
  bulky: '#f5d5ea', super_bulky: '#e8f5d5',
};

type ViewMode = 'table' | 'grid';

function firstPhoto(yarn: Yarn): string | null {
  if (!yarn.photos) return null;
  try { const a = JSON.parse(yarn.photos); return a[0] ?? null; }
  catch { return null; }
}

export default function YarnView() {
  const [yarns, setYarns]       = useState<Yarn[]>([]);
  const [selected, setSelected] = useState<Yarn | null | 'new'>(null);
  const [filterWeight, setFilterWeight] = useState<YarnWeight | ''>('');
  const [filterFeature, setFilterFeature] = useState<string>('');
  const [search, setSearch]     = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const load = async () => setYarns(await listYarns());
  useEffect(() => { load(); }, []);

  const allFeatures = [...new Set(yarns.map(y => y.color_feature).filter(Boolean))] as string[];

  const visible = yarns.filter(y => {
    if (filterWeight && y.weight !== filterWeight) return false;
    if (filterFeature && y.color_feature !== filterFeature) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        y.name.toLowerCase().includes(q) ||
        (y.brand ?? '').toLowerCase().includes(q) ||
        y.fiber_content.toLowerCase().includes(q) ||
        (y.color ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSave = async (input: CreateYarnInput) => {
    if (selected === 'new') {
      await createYarn(input);
    } else if (selected) {
      await updateYarn((selected as Yarn).id, input);
    }
    setSelected(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this yarn?')) return;
    await deleteYarn(id);
    setSelected(null);
    await load();
  };

  const isSelected = (y: Yarn) => selected !== 'new' && (selected as Yarn)?.id === y.id;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px',
          borderBottom: '1px solid #e5dff0', background: '#fff', flexShrink: 0,
        }}>
          <input
            placeholder="Search yarns…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inputStyle}
          />
          <select value={filterWeight} onChange={e => setFilterWeight(e.target.value as YarnWeight | '')} style={inputStyle}>
            <option value="">All weights</option>
            {WEIGHT_ORDER.map(w => <option key={w} value={w}>{WEIGHT_LABELS[w]}</option>)}
          </select>
          <select value={filterFeature} onChange={e => setFilterFeature(e.target.value)} style={inputStyle}>
            <option value="">All features</option>
            {allFeatures.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid #d8d0ea', borderRadius: 6, overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('table')}
              title="Table view"
              style={{
                padding: '5px 10px', border: 'none', cursor: 'pointer', fontSize: 14,
                background: viewMode === 'table' ? '#7c5cbf' : 'transparent',
                color: viewMode === 'table' ? '#fff' : '#888',
              }}
            >☰</button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              style={{
                padding: '5px 10px', border: 'none', cursor: 'pointer', fontSize: 14,
                background: viewMode === 'grid' ? '#7c5cbf' : 'transparent',
                color: viewMode === 'grid' ? '#fff' : '#888',
                borderLeft: '1px solid #d8d0ea',
              }}
            >⊞</button>
          </div>

          <button onClick={() => setSelected('new')} style={primaryBtn}>+ New Yarn</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {viewMode === 'table' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f3eefb', position: 'sticky', top: 0, zIndex: 1 }}>
                  {['Name','Brand','Weight','Color','Feature','Fiber','Skeins','Yds/skein'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#999' }}>No yarns found</td></tr>
                )}
                {visible.map(y => (
                  <tr
                    key={y.id}
                    onClick={() => setSelected(y)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected(y) ? '#f0ebfa' : 'transparent',
                      borderBottom: '1px solid #ede8f5',
                    }}
                    onMouseEnter={e => { if (!isSelected(y)) (e.currentTarget as HTMLElement).style.background = '#faf8fd'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected(y) ? '#f0ebfa' : 'transparent'; }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {firstPhoto(y)
                          ? <img src={firstPhoto(y)!} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 28, height: 28, borderRadius: 4, background: WEIGHT_COLORS[y.weight] ?? '#eee', flexShrink: 0 }} />
                        }
                        <strong>{y.name}</strong>
                      </div>
                    </td>
                    <td style={tdStyle}>{y.brand ?? '—'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: WEIGHT_COLORS[y.weight] ?? '#eee',
                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                      }}>
                        {WEIGHT_LABELS[y.weight] ?? y.weight}
                      </span>
                    </td>
                    <td style={tdStyle}>{y.color ?? '—'}</td>
                    <td style={tdStyle}>{y.color_feature ?? '—'}</td>
                    <td style={tdStyle}>{y.fiber_content}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{y.skeins_owned}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{y.yardage_per_skein ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* ── Grid view ── */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              padding: 24,
            }}>
              {visible.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#999', padding: 32 }}>
                  No yarns found
                </div>
              )}
              {visible.map(y => {
                const photo = firstPhoto(y);
                return (
                  <div
                    key={y.id}
                    onClick={() => setSelected(y)}
                    style={{
                      borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                      border: isSelected(y) ? '2px solid #7c5cbf' : '2px solid transparent',
                      background: '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      transition: 'box-shadow 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(124,92,191,0.18)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; }}
                  >
                    {/* Image */}
                    <div style={{
                      width: '100%', aspectRatio: '1 / 1', overflow: 'hidden',
                      background: WEIGHT_COLORS[y.weight] ?? '#f0ebfa',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {photo
                        ? <img src={photo} alt={y.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 32, opacity: 0.35 }}>🧶</span>
                      }
                    </div>
                    {/* Label */}
                    <div style={{ padding: '8px 10px 10px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {y.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {[y.brand, WEIGHT_LABELS[y.weight]].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 24px', fontSize: 12, color: '#999', borderTop: '1px solid #e5dff0', background: '#fff' }}>
          {visible.length} of {yarns.length} yarn{yarns.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected !== null && (
        <YarnPanel
          yarn={selected === 'new' ? null : selected as Yarn}
          onSave={handleSave}
          onDelete={selected !== 'new' ? () => handleDelete((selected as Yarn).id) : undefined}
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

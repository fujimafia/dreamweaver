import { useEffect, useState } from 'react';
import { listPatterns, createPattern, updatePattern, deletePattern } from '../db/patterns';
import type { Pattern, CreatePatternInput, PatternSourceType } from '../db/types';
import PatternPanel from '../components/PatternPanel';

type ViewMode = 'table' | 'grid';

const SOURCE_LABELS: Record<PatternSourceType, string> = {
  etsy: 'Etsy', free_pdf: 'Free PDF', physical_book: 'Physical Book', magazine: 'Magazine',
};

const SOURCE_COLORS: Record<PatternSourceType, string> = {
  etsy: '#fde8d5', free_pdf: '#d5eaf5', physical_book: '#e8f5d5', magazine: '#f5d5ea',
};

interface Props {
  initialPatternId?: string;
}

export default function PatternView({ initialPatternId }: Props) {
  const [patterns, setPatterns]   = useState<Pattern[]>([]);
  const [selected, setSelected]   = useState<Pattern | null | 'new'>(null);
  const [filterSource, setFilterSource] = useState<PatternSourceType | ''>('');
  const [search, setSearch]       = useState('');
  const [viewMode, setViewMode]   = useState<ViewMode>('table');

  const load = async () => {
    const all = await listPatterns();
    setPatterns(all);
    return all;
  };

  useEffect(() => {
    load().then(all => {
      if (initialPatternId) {
        const match = all.find(p => p.id === initialPatternId);
        if (match) setSelected(match);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPatternId]);

  const visible = patterns.filter(p => {
    if (filterSource && p.source_type !== filterSource) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.designer ?? '').toLowerCase().includes(q) ||
        (p.called_for_yarn_weight ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSave = async (input: CreatePatternInput) => {
    if (selected === 'new') {
      await createPattern(input);
    } else if (selected) {
      await updatePattern((selected as Pattern).id, input);
    }
    setSelected(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pattern?')) return;
    await deletePattern(id);
    setSelected(null);
    await load();
  };

  const isSelected = (p: Pattern) => selected !== 'new' && (selected as Pattern)?.id === p.id;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '16px 24px',
          borderBottom: '1px solid #e5dff0', background: '#fff', flexShrink: 0,
        }}>
          <input
            placeholder="Search patterns…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inputStyle}
          />
          <select value={filterSource} onChange={e => setFilterSource(e.target.value as PatternSourceType | '')} style={inputStyle}>
            <option value="">All sources</option>
            {(Object.keys(SOURCE_LABELS) as PatternSourceType[]).map(s => (
              <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
            ))}
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

          <button onClick={() => setSelected('new')} style={primaryBtn}>+ New Pattern</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {viewMode === 'table' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f3eefb', position: 'sticky', top: 0, zIndex: 1 }}>
                  {['Title', 'Designer', 'Source', 'Weight', 'Yardage', 'Skills'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#999' }}>No patterns found</td></tr>
                )}
                {visible.map(p => {
                  const skills: string[] = p.required_skills ? JSON.parse(p.required_skills) : [];
                  return (
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
                      <td style={tdStyle}>{p.designer ?? '—'}</td>
                      <td style={tdStyle}>
                        <span style={{
                          background: SOURCE_COLORS[p.source_type] ?? '#eee',
                          padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        }}>{SOURCE_LABELS[p.source_type]}</span>
                      </td>
                      <td style={tdStyle}>{p.called_for_yarn_weight ?? '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{p.called_for_yardage ? `${p.called_for_yardage} yds` : '—'}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {skills.slice(0, 3).map(s => (
                            <span key={s} style={{ background: '#ede8f9', color: '#5a3fa0', padding: '1px 7px', borderRadius: 8, fontSize: 11 }}>{s}</span>
                          ))}
                          {skills.length > 3 && <span style={{ fontSize: 11, color: '#999' }}>+{skills.length - 3}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                  No patterns found
                </div>
              )}
              {visible.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelected(p)}
                  style={{
                    borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                    border: isSelected(p) ? '2px solid #7c5cbf' : '2px solid transparent',
                    background: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(124,92,191,0.18)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; }}
                >
                  {/* Placeholder image area */}
                  <div style={{
                    width: '100%', aspectRatio: '1 / 1', overflow: 'hidden',
                    background: SOURCE_COLORS[p.source_type] ?? '#f0ebfa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 36, opacity: 0.4 }}>🧵</span>
                  </div>
                  {/* Label */}
                  <div style={{ padding: '8px 10px 10px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {[p.designer, SOURCE_LABELS[p.source_type]].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 24px', fontSize: 12, color: '#999', borderTop: '1px solid #e5dff0', background: '#fff' }}>
          {visible.length} of {patterns.length} pattern{patterns.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Detail panel */}
      {selected !== null && (
        <PatternPanel
          pattern={selected === 'new' ? null : selected as Pattern}
          onSave={handleSave}
          onDelete={selected !== 'new' ? () => handleDelete((selected as Pattern).id) : undefined}
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

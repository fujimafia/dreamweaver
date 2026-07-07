import { useEffect, useRef, useState } from 'react';
import type { Yarn, CreateYarnInput, YarnWeight } from '../db/types';
import type { YarnProjectLink } from '../db/projects';
import {
  getProjectsForYarn, listProjects, addYarnToProject, createProject,
} from '../db/projects';
import type { YarnPatternLink } from '../db/patterns';
import {
  getPatternsForYarn, listPatterns, addYarnToPattern, createPattern,
} from '../db/patterns';
import type { Pattern, Project } from '../db/types';
import type { NavigateOpts } from '../App';
import type { NavSection } from '../nav';

const WEIGHTS: YarnWeight[] = ['lace','fingering','sport','dk','worsted','aran','bulky','super_bulky'];
const WEIGHT_LABELS: Record<YarnWeight, string> = {
  lace: 'Lace', fingering: 'Fingering', sport: 'Sport', dk: 'DK',
  worsted: 'Worsted', aran: 'Aran', bulky: 'Bulky', super_bulky: 'Super Bulky',
};
const WEIGHT_COLORS: Record<YarnWeight, string> = {
  lace: '#e8d5f5', fingering: '#d5e8f5', sport: '#d5f5e8',
  dk: '#f5ead5', worsted: '#f5d5d5', aran: '#d5d5f5',
  bulky: '#f5d5ea', super_bulky: '#e8f5d5',
};
const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned', in_progress: 'In Progress',
  completed: 'Completed', ready_to_wear: 'Ready to Wear',
};
const STATUS_COLORS: Record<string, string> = {
  planned: '#d5e8f5', in_progress: '#d5f5e8',
  completed: '#e8d5f5', ready_to_wear: '#f5ead5',
};
const COLOR_FEATURES = ['Solid','Heather','Tweed','Variegated','Speckled','Marled'];

interface Props {
  yarn: Yarn | null;       // null = new (always opens in edit mode)
  onSave: (input: CreateYarnInput) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
  onNavigate?: (section: NavSection, opts?: NavigateOpts) => void;
}

function toInput(y: Yarn): CreateYarnInput {
  return {
    name: y.name, brand: y.brand ?? undefined, fiberContent: y.fiber_content,
    weight: y.weight, gaugeStitches: y.gauge_stitches ?? undefined,
    gaugeRows: y.gauge_rows ?? undefined, needleSizeMm: y.needle_size_mm ?? undefined,
    yardagePerSkein: y.yardage_per_skein ?? undefined, metersPerSkein: y.meters_per_skein ?? undefined,
    skeinsOwned: y.skeins_owned, color: y.color ?? undefined,
    colorFeature: y.color_feature ?? undefined, colorway: y.colorway ?? undefined,
    dyeLot: y.dye_lot ?? undefined, pricePerSkein: y.price_per_skein ?? undefined,
    purchaseUrl: y.purchase_url ?? undefined, notes: y.notes ?? undefined,
    photos: y.photos ? JSON.parse(y.photos) : [],
  };
}

const EMPTY: CreateYarnInput = {
  name: '', fiberContent: '', weight: 'worsted', skeinsOwned: 0, photos: [],
};

export default function YarnPanel({ yarn, onSave, onDelete, onClose, onNavigate }: Props) {
  const isNew = yarn === null;
  const [mode, setMode]         = useState<'view' | 'edit'>(isNew ? 'edit' : 'view');
  const [form, setForm]         = useState<CreateYarnInput>(yarn ? toInput(yarn) : EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Projects / inventory
  const [linkedProjects, setLinkedProjects] = useState<YarnProjectLink[]>([]);
  const [allProjects, setAllProjects]       = useState<Project[]>([]);
  const [showAddProject, setShowAddProject] = useState(false);
  const [addMode, setAddMode]               = useState<'existing' | 'new'>('existing');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [yardageForProject, setYardageForProject]  = useState('');
  const [newProjectTitle, setNewProjectTitle]       = useState('');
  const [addingProject, setAddingProject]           = useState(false);

  // Patterns
  const [linkedPatterns, setLinkedPatterns]   = useState<YarnPatternLink[]>([]);
  const [allPatterns, setAllPatterns]         = useState<Pattern[]>([]);
  const [showAddPattern, setShowAddPattern]   = useState(false);
  const [patternAddMode, setPatternAddMode]   = useState<'existing' | 'new'>('existing');
  const [selectedPatternId, setSelectedPatternId] = useState('');
  const [newPatternTitle, setNewPatternTitle]     = useState('');
  const [addingPattern, setAddingPattern]         = useState(false);

  const photos = form.photos ?? [];

  useEffect(() => {
    if (yarn) {
      setForm(toInput(yarn));
      loadLinks(yarn.id);
    }
  }, [yarn?.id]);

  const loadLinks = async (id: string) => {
    const [links, projects, patternLinks, patterns] = await Promise.all([
      getProjectsForYarn(id), listProjects(),
      getPatternsForYarn(id), listPatterns(),
    ]);
    setLinkedProjects(links);
    setAllProjects(projects);
    setLinkedPatterns(patternLinks);
    setAllPatterns(patterns);
  };

  // ── Inventory math ──────────────────────────────────────────────────────────
  const totalYards = (yarn?.skeins_owned ?? 0) * (yarn?.yardage_per_skein ?? 0);
  const yardsUsed  = linkedProjects.reduce((s, p) => s + (p.yardage_used ?? 0), 0);
  const yardsAvail = totalYards - yardsUsed;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const set = (field: keyof CreateYarnInput, value: unknown) =>
    setForm(f => ({ ...f, [field]: value === '' ? undefined : value }));

  const readFile = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      if (!file.type.startsWith('image/')) { rej(new Error('Not an image')); return; }
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const addFiles = async (files: FileList | File[]) => {
    const results = await Promise.all(Array.from(files).map(f => readFile(f).catch(() => null)));
    const valid = results.filter(Boolean) as string[];
    setForm(f => ({ ...f, photos: [...(f.photos ?? []), ...valid] }));
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!form.name.trim())         { setError('Name is required.'); return; }
    if (!form.fiberContent.trim()) { setError('Fiber content is required.'); return; }
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

  const handleAddProject = async () => {
    if (!yarn) return;
    setAddingProject(true);
    try {
      let projectId = selectedProjectId;
      let isNewProject = false;
      if (addMode === 'new') {
        if (!newProjectTitle.trim()) return;
        const p = await createProject({ title: newProjectTitle.trim() });
        projectId = p.id;
        isNewProject = true;
      }
      if (!projectId) return;
      await addYarnToProject(projectId, yarn.id, {
        yardageUsed: yardageForProject ? parseInt(yardageForProject) : 0,
      });
      setShowAddProject(false);
      setSelectedProjectId(''); setYardageForProject(''); setNewProjectTitle('');
      await loadLinks(yarn.id);
      // Navigate to the new project so the user can continue editing it
      if (isNewProject && onNavigate) {
        onNavigate('project', { projectId });
      }
    } finally {
      setAddingProject(false);
    }
  };

  const handleAddPattern = async () => {
    if (!yarn) return;
    setAddingPattern(true);
    try {
      let patternId = selectedPatternId;
      let isNewPattern = false;
      if (patternAddMode === 'new') {
        if (!newPatternTitle.trim()) return;
        const p = await createPattern({ title: newPatternTitle.trim(), sourceType: 'free_pdf' });
        patternId = p.id;
        isNewPattern = true;
      }
      if (!patternId) return;
      await addYarnToPattern(patternId, yarn.id, {});
      setShowAddPattern(false);
      setSelectedPatternId(''); setNewPatternTitle('');
      await loadLinks(yarn.id);
      if (isNewPattern && onNavigate) {
        onNavigate('pattern', { patternId });
      }
    } finally {
      setAddingPattern(false);
    }
  };

  // ── Unlinked projects (not already linked to this yarn) ──────────────────
  const linkedIds = new Set(linkedProjects.map(p => p.project_id));
  const availableProjects = allProjects.filter(p => !linkedIds.has(p.id));

  const linkedPatternIds = new Set(linkedPatterns.map(p => p.pattern_id));
  const availablePatterns = allPatterns.filter(p => !linkedPatternIds.has(p.id));

  // ── View mode ───────────────────────────────────────────────────────────────
  const renderView = () => {
    if (!yarn) return null;
    const coverPhoto = photos[0] ?? null;
    const rows: [string, React.ReactNode][] = [
      ['Amount',        `${yarn.skeins_owned} skein${yarn.skeins_owned !== 1 ? 's' : ''}`],
      ['Brand',         yarn.brand],
      ['Color',         yarn.color],
      ['Color Feature', yarn.color_feature],
      ['Material',      yarn.fiber_content],
      ['Weight',        <span key="w" style={{ background: WEIGHT_COLORS[yarn.weight], padding: '2px 10px', borderRadius: 6, fontWeight: 600, fontSize: 13 }}>{WEIGHT_LABELS[yarn.weight]}</span>],
      ['Yardage / skein', yarn.yardage_per_skein ? `${yarn.yardage_per_skein} yds` : null],
      ['Gauge',         yarn.gauge_stitches ? `${yarn.gauge_stitches} sts / ${yarn.gauge_rows ?? '?'} rows per 10cm` : null],
      ['Needle size',   yarn.needle_size_mm ? `${yarn.needle_size_mm} mm` : null],
      ['Price / skein', yarn.price_per_skein ? `$${yarn.price_per_skein.toFixed(2)}` : null],
      ['Dye Lot',       yarn.dye_lot],
      ['Notes',         yarn.notes],
    ];

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        {/* Cover photo strip */}
        {coverPhoto && (
          <div style={{ margin: '0 -24px 20px', height: 180, overflow: 'hidden' }}>
            <img src={coverPhoto} alt={yarn.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        {/* Title */}
        <h2 style={{ margin: '20px 0 20px', fontSize: 26, fontWeight: 800, color: '#1a1a2e' }}>{yarn.name}</h2>

        {/* Properties */}
        {rows.map(([label, val]) => val == null ? null : (
          <div key={label} style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid #f0ebfa' }}>
            <span style={{ width: 130, flexShrink: 0, fontSize: 13, color: '#999', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ opacity: 0.5, fontSize: 11 }}>≡</span> {label}
            </span>
            <span style={{ fontSize: 13, color: '#1a1a2e' }}>{val}</span>
          </div>
        ))}

        {/* Extra photos */}
        {photos.length > 1 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#7c5cbf', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Photos</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {photos.map((src, i) => (
                <img key={i} src={src} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5dff0' }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Inventory section ── */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>Inventory</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              ['Total yards', totalYards > 0 ? `${totalYards} yds` : '—'],
              ['Yarn used',   yardsUsed > 0   ? `${yardsUsed} yds`  : '0 yds'],
              ['Available',   totalYards > 0  ? `${Math.max(0, yardsAvail)} yds` : '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ background: '#f7f4fd', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: yardsAvail < 0 && label === 'Available' ? '#c0392b' : '#1a1a2e' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Linked projects */}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#7c5cbf', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Projects using this yarn
          </div>
          {linkedProjects.length === 0 && (
            <div style={{ fontSize: 12, color: '#bbb', marginBottom: 12 }}>Not linked to any projects yet.</div>
          )}
          {linkedProjects.map(p => (
            <div key={p.project_id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: 7, background: '#f7f4fd', marginBottom: 6,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.project_title}</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  <span style={{ background: STATUS_COLORS[p.project_status] ?? '#eee', padding: '1px 7px', borderRadius: 8, fontSize: 10, fontWeight: 600 }}>
                    {STATUS_LABELS[p.project_status] ?? p.project_status}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: '#666' }}>
                {p.yardage_used ? `${p.yardage_used} yds used` : 'No yardage recorded'}
              </div>
            </div>
          ))}

          {/* Add to project */}
          {!showAddProject ? (
            <button onClick={() => setShowAddProject(true)} style={ghostBtn}>
              + Add to project
            </button>
          ) : (
            <div style={{ border: '1px solid #e5dff0', borderRadius: 8, padding: 14, marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => setAddMode('existing')}
                  style={{ ...tabBtn, background: addMode === 'existing' ? '#7c5cbf' : 'transparent', color: addMode === 'existing' ? '#fff' : '#666' }}
                >Existing project</button>
                <button
                  onClick={() => setAddMode('new')}
                  style={{ ...tabBtn, background: addMode === 'new' ? '#7c5cbf' : 'transparent', color: addMode === 'new' ? '#fff' : '#666' }}
                >New project</button>
              </div>

              {addMode === 'existing' ? (
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  style={{ ...inputS, marginBottom: 8 }}
                >
                  <option value="">Select a project…</option>
                  {availableProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              ) : (
                <input
                  style={{ ...inputS, marginBottom: 8 }}
                  placeholder="New project name…"
                  value={newProjectTitle}
                  onChange={e => setNewProjectTitle(e.target.value)}
                />
              )}

              <input
                style={{ ...inputS, marginBottom: 10 }}
                type="number" min={0} placeholder="Yardage called for (optional)"
                value={yardageForProject}
                onChange={e => setYardageForProject(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleAddProject} disabled={addingProject} style={primaryBtn}>
                  {addingProject ? 'Adding…' : 'Link'}
                </button>
                <button onClick={() => setShowAddProject(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Patterns section ── */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#7c5cbf', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Patterns using this yarn
          </div>
          {linkedPatterns.length === 0 && (
            <div style={{ fontSize: 12, color: '#bbb', marginBottom: 12 }}>Not linked to any patterns yet.</div>
          )}
          {linkedPatterns.map(p => (
            <div key={p.pattern_id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: 7, background: '#f7f4fd', marginBottom: 6,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.pattern_title}</div>
              <div style={{ fontSize: 11, color: '#888' }}>
                {p.is_substitution ? 'Substitution' : 'Called for'}
              </div>
            </div>
          ))}

          {!showAddPattern ? (
            <button onClick={() => setShowAddPattern(true)} style={ghostBtn}>
              + Link to pattern
            </button>
          ) : (
            <div style={{ border: '1px solid #e5dff0', borderRadius: 8, padding: 14, marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => setPatternAddMode('existing')}
                  style={{ ...tabBtn, background: patternAddMode === 'existing' ? '#7c5cbf' : 'transparent', color: patternAddMode === 'existing' ? '#fff' : '#666' }}
                >Existing pattern</button>
                <button
                  onClick={() => setPatternAddMode('new')}
                  style={{ ...tabBtn, background: patternAddMode === 'new' ? '#7c5cbf' : 'transparent', color: patternAddMode === 'new' ? '#fff' : '#666' }}
                >New pattern</button>
              </div>

              {patternAddMode === 'existing' ? (
                <select
                  value={selectedPatternId}
                  onChange={e => setSelectedPatternId(e.target.value)}
                  style={{ ...inputS, marginBottom: 10 }}
                >
                  <option value="">Select a pattern…</option>
                  {availablePatterns.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              ) : (
                <input
                  style={{ ...inputS, marginBottom: 10 }}
                  placeholder="New pattern name…"
                  value={newPatternTitle}
                  onChange={e => setNewPatternTitle(e.target.value)}
                />
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleAddPattern} disabled={addingPattern} style={primaryBtn}>
                  {addingPattern ? 'Linking…' : 'Link'}
                </button>
                <button onClick={() => setShowAddPattern(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Edit mode ───────────────────────────────────────────────────────────────
  const renderEdit = () => (
    <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      <Field label="Photos">
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={async e => { e.preventDefault(); setDragOver(false); await addFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#7c5cbf' : '#d8d0ea'}`, borderRadius: 8,
            padding: '12px 10px', cursor: 'pointer', background: dragOver ? '#f5f0ff' : '#faf8fd',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 12, color: '#999', minHeight: 48,
          }}
        >
          <span style={{ fontSize: 16 }}>📷</span>
          <span>Drop images or click to browse</span>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => e.target.files && addFiles(e.target.files)} />
        {photos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {photos.map((src, idx) => (
              <div key={idx} style={{ position: 'relative', width: 72, height: 72 }}>
                <img src={src} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5dff0' }} />
                <button type="button" onClick={() => setForm(f => ({ ...f, photos: (f.photos ?? []).filter((_, i) => i !== idx) }))}
                  style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#c0392b', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Field>

      <Field label="Name *">
        <input style={inputS} value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
      </Field>
      <Field label="Brand">
        <input style={inputS} value={form.brand ?? ''} onChange={e => set('brand', e.target.value)} />
      </Field>
      <Field label="Fiber Content *">
        <input style={inputS} value={form.fiberContent} onChange={e => set('fiberContent', e.target.value)} placeholder="e.g. 100% merino wool" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Weight *">
          <select style={inputS} value={form.weight} onChange={e => set('weight', e.target.value as YarnWeight)}>
            {WEIGHTS.map(w => <option key={w} value={w}>{WEIGHT_LABELS[w]}</option>)}
          </select>
        </Field>
        <Field label="Skeins Owned">
          <input style={inputS} type="number" min={0} step={0.5} value={form.skeinsOwned ?? 0}
            onChange={e => set('skeinsOwned', parseFloat(e.target.value) || 0)} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Color">
          <input style={inputS} value={form.color ?? ''} onChange={e => set('color', e.target.value)} />
        </Field>
        <Field label="Color Feature">
          <select style={inputS} value={form.colorFeature ?? ''} onChange={e => set('colorFeature', e.target.value)}>
            <option value="">—</option>
            {COLOR_FEATURES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Colorway">
        <input style={inputS} value={form.colorway ?? ''} onChange={e => set('colorway', e.target.value)} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Yardage / skein">
          <input style={inputS} type="number" min={0} value={form.yardagePerSkein ?? ''}
            onChange={e => set('yardagePerSkein', e.target.value === '' ? undefined : parseInt(e.target.value))} />
        </Field>
        <Field label="Metres / skein">
          <input style={inputS} type="number" min={0} value={form.metersPerSkein ?? ''}
            onChange={e => set('metersPerSkein', e.target.value === '' ? undefined : parseInt(e.target.value))} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Gauge (sts/10cm)">
          <input style={inputS} type="number" min={0} step={0.5} value={form.gaugeStitches ?? ''}
            onChange={e => set('gaugeStitches', e.target.value === '' ? undefined : parseFloat(e.target.value))} />
        </Field>
        <Field label="Gauge (rows/10cm)">
          <input style={inputS} type="number" min={0} step={0.5} value={form.gaugeRows ?? ''}
            onChange={e => set('gaugeRows', e.target.value === '' ? undefined : parseFloat(e.target.value))} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Needle size (mm)">
          <input style={inputS} type="number" min={0} step={0.25} value={form.needleSizeMm ?? ''}
            onChange={e => set('needleSizeMm', e.target.value === '' ? undefined : parseFloat(e.target.value))} />
        </Field>
        <Field label="Price / skein">
          <input style={inputS} type="number" min={0} step={0.01} value={form.pricePerSkein ?? ''}
            onChange={e => set('pricePerSkein', e.target.value === '' ? undefined : parseFloat(e.target.value))} />
        </Field>
      </div>
      <Field label="Dye Lot">
        <input style={inputS} value={form.dyeLot ?? ''} onChange={e => set('dyeLot', e.target.value)} />
      </Field>
      <Field label="Purchase URL">
        <input style={inputS} value={form.purchaseUrl ?? ''} onChange={e => set('purchaseUrl', e.target.value)} />
      </Field>
      <Field label="Notes">
        <textarea style={{ ...inputS, height: 72, resize: 'vertical' }} value={form.notes ?? ''}
          onChange={e => set('notes', e.target.value)} />
      </Field>
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
          <button onClick={() => { setMode('view'); setForm(toInput(yarn!)); setError(''); }} style={ghostBtn}>
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

      {/* Body */}
      {mode === 'view' ? renderView() : renderEdit()}

      {/* Footer — only shown in edit mode */}
      {mode === 'edit' && (
        <div style={{
          padding: '12px 16px', borderTop: '1px solid #e5dff0',
          display: 'flex', gap: 8, background: '#fff', flexShrink: 0,
        }}>
          <button type="button" onClick={handleSubmit} disabled={saving} style={primaryBtn}>
            {saving ? 'Saving…' : yarn ? 'Save Changes' : 'Add Yarn'}
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
const tabBtn: React.CSSProperties = {
  padding: '4px 10px', border: '1px solid #d8d0ea', borderRadius: 6,
  fontSize: 12, cursor: 'pointer',
};

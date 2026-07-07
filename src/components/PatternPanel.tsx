import { useEffect, useRef, useState } from 'react';
import type { Pattern, CreatePatternInput, PatternSourceType, Yarn } from '../db/types';
import type { PatternYarnLink } from '../db/patterns';
import {
  getYarnsForPattern, addYarnToPattern, removeYarnFromPattern,
} from '../db/patterns';
import { listYarns } from '../db/yarns';
import { parsePattern, type ParsedPattern } from '../lib/parsePattern';

const SOURCE_TYPES: { value: PatternSourceType; label: string }[] = [
  { value: 'etsy',          label: 'Etsy' },
  { value: 'free_pdf',      label: 'Free PDF' },
  { value: 'physical_book', label: 'Physical Book' },
  { value: 'magazine',      label: 'Magazine' },
];

const SOURCE_LABELS: Record<PatternSourceType, string> = {
  etsy: 'Etsy', free_pdf: 'Free PDF', physical_book: 'Physical Book', magazine: 'Magazine',
};

const SKILL_OPTIONS = [
  'Stockinette', 'Garter', 'Rib', 'Seed stitch',
  'Cable', 'Lace', 'Brioche', 'Colourwork', 'Fair Isle',
  'Short rows', 'Increases / Decreases', 'Provisional cast-on',
];

const WEIGHT_LABELS: Record<string, string> = {
  lace: 'Lace', fingering: 'Fingering', sport: 'Sport', dk: 'DK',
  worsted: 'Worsted', aran: 'Aran', bulky: 'Bulky', super_bulky: 'Super Bulky',
};

interface Props {
  pattern: Pattern | null;
  onSave: (input: CreatePatternInput) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

function toForm(p: Pattern): CreatePatternInput {
  return {
    title: p.title,
    designer: p.designer ?? undefined,
    sourceType: p.source_type,
    sourceUrl: p.source_url ?? undefined,
    pdfPath: p.pdf_path ?? undefined,
    pdfText: p.pdf_text ?? undefined,
    requiredSkills: p.required_skills ? JSON.parse(p.required_skills) : [],
    calledForYarnWeight: p.called_for_yarn_weight ?? undefined,
    calledForGaugeStitches: p.called_for_gauge_stitches ?? undefined,
    calledForGaugeRows: p.called_for_gauge_rows ?? undefined,
    calledForNeedleSizeMm: p.called_for_needle_size_mm ?? undefined,
    calledForYardage: p.called_for_yardage ?? undefined,
    notes: p.notes ?? undefined,
  };
}

const EMPTY: CreatePatternInput = {
  title: '', sourceType: 'free_pdf', requiredSkills: [],
};

function mimeFromDataUrl(dataUrl: string): string {
  return dataUrl.split(':')[1]?.split(';')[0] ?? '';
}

function dataUrlToObjectUrl(dataUrl: string): string {
  const [header, b64] = dataUrl.split(',');
  const mime = header.split(':')[1]?.split(';')[0] ?? '';
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: mime }));
}

export default function PatternPanel({ pattern, onSave, onDelete, onClose }: Props) {
  const isNew = pattern === null;
  const [mode, setMode]         = useState<'view' | 'edit'>(isNew ? 'edit' : 'view');
  const [form, setForm]         = useState<CreatePatternInput>(pattern ? toForm(pattern) : EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Blob URL for rendering PDF/image (avoids embedding huge data URL into DOM)
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Parse result
  const [parsed, setParsed]   = useState<ParsedPattern | null>(null);
  const [parsing, setParsing] = useState(false);

  // Yarn links
  const [linkedYarns, setLinkedYarns]   = useState<PatternYarnLink[]>([]);
  const [allYarns, setAllYarns]         = useState<Yarn[]>([]);
  const [showAddYarn, setShowAddYarn]   = useState(false);
  const [selectedYarnId, setSelectedYarnId] = useState('');
  const [yarnYardage, setYarnYardage]       = useState('');
  const [addingYarn, setAddingYarn]         = useState(false);

  useEffect(() => {
    if (pattern) {
      setForm(toForm(pattern));
      loadYarnLinks(pattern.id);
    }
    setParsed(null);
  }, [pattern?.id]);

  // Create/revoke object URL when the stored file content changes
  useEffect(() => {
    const src = pattern?.pdf_path ?? null;
    if (!src) { setObjectUrl(null); return; }
    const url = dataUrlToObjectUrl(src);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pattern?.pdf_path]);

  const loadYarnLinks = async (id: string) => {
    const [links, yarns] = await Promise.all([getYarnsForPattern(id), listYarns()]);
    setLinkedYarns(links);
    setAllYarns(yarns);
  };

  const set = (field: keyof CreatePatternInput, value: unknown) =>
    setForm(f => ({ ...f, [field]: value === '' ? undefined : value }));

  const toggleSkill = (skill: string) => {
    const skills = form.requiredSkills ?? [];
    set('requiredSkills', skills.includes(skill)
      ? skills.filter(s => s !== skill)
      : [...skills, skill],
    );
  };

  // ── File ingestion ────────────────────────────────────────────────────────
  const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const ingestFile = async (file: File) => {
    const name = file.name.replace(/\.[^.]+$/, '');

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text();
      setForm(f => ({
        ...f,
        title: f.title || name,
        pdfText: text,
      }));
      return;
    }

    if (file.type.startsWith('image/') ||
        file.name.match(/\.(png|jpe?g|webp|gif)$/i)) {
      const dataUrl = await readAsDataUrl(file);
      setForm(f => ({
        ...f,
        title: f.title || name,
        pdfPath: dataUrl,
      }));
      return;
    }

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const dataUrl = await readAsDataUrl(file);
      setForm(f => ({
        ...f,
        title: f.title || name,
        pdfPath: dataUrl,
      }));
      return;
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    for (const f of Array.from(e.dataTransfer.files)) await ingestFile(f);
  };

  // ── Parse ─────────────────────────────────────────────────────────────────
  const handleParse = () => {
    const text = pattern?.pdf_text ?? '';
    if (!text.trim()) return;
    setParsing(true);
    // parsePattern is sync; wrap in setTimeout so the button state flashes
    setTimeout(() => {
      setParsed(parsePattern(text));
      setParsing(false);
    }, 0);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
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

  // ── Yarn linking ──────────────────────────────────────────────────────────
  const handleAddYarn = async () => {
    if (!pattern || !selectedYarnId) return;
    setAddingYarn(true);
    try {
      await addYarnToPattern(pattern.id, selectedYarnId, {
        yardage: yarnYardage ? parseInt(yarnYardage) : undefined,
      });
      setShowAddYarn(false);
      setSelectedYarnId('');
      setYarnYardage('');
      await loadYarnLinks(pattern.id);
    } finally {
      setAddingYarn(false);
    }
  };

  const handleRemoveYarn = async (yarnId: string) => {
    if (!pattern) return;
    await removeYarnFromPattern(pattern.id, yarnId);
    await loadYarnLinks(pattern.id);
  };

  const linkedYarnIds = new Set(linkedYarns.map(y => y.yarn_id));
  const availableYarns = allYarns.filter(y => !linkedYarnIds.has(y.id));

  // What kind of content is stored?
  const fileMime  = pattern?.pdf_path ? mimeFromDataUrl(pattern.pdf_path) : null;
  const hasPdf    = fileMime === 'application/pdf';
  const hasImage  = fileMime?.startsWith('image/') ?? false;
  const hasText   = !!pattern?.pdf_text;
  const hasContent = hasPdf || hasImage || hasText;

  // Widen panel when there's file content to display
  const panelWidth = hasContent && mode === 'view' ? 680 : 420;

  // ── View ──────────────────────────────────────────────────────────────────
  const renderView = () => {
    if (!pattern) return null;
    const skills: string[] = pattern.required_skills ? JSON.parse(pattern.required_skills) : [];
    const metaRows: [string, React.ReactNode][] = [
      ['Designer',    pattern.designer],
      ['Source',      SOURCE_LABELS[pattern.source_type]],
      ['Source URL',  pattern.source_url
        ? <a href={pattern.source_url} target="_blank" rel="noreferrer" style={{ color: '#7c5cbf', wordBreak: 'break-all' }}>{pattern.source_url}</a>
        : null],
      ['Yarn weight', pattern.called_for_yarn_weight],
      ['Gauge',       pattern.called_for_gauge_stitches
        ? `${pattern.called_for_gauge_stitches} sts / ${pattern.called_for_gauge_rows ?? '?'} rows per 10 cm`
        : null],
      ['Needle size', pattern.called_for_needle_size_mm ? `${pattern.called_for_needle_size_mm} mm` : null],
      ['Total yardage', pattern.called_for_yardage ? `${pattern.called_for_yardage} yds` : null],
      ['Notes',       pattern.notes],
    ];

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        <h2 style={{ margin: '20px 0 12px', fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>
          {pattern.title}
        </h2>

        {/* ── File content viewer ── */}
        {hasPdf && objectUrl && (
          <div style={{ margin: '0 -24px 20px', borderBottom: '1px solid #e5dff0' }}>
            <embed
              src={objectUrl}
              type="application/pdf"
              style={{ width: '100%', height: 500, display: 'block', border: 'none' }}
            />
          </div>
        )}
        {hasImage && objectUrl && (
          <div style={{ margin: '0 -24px 20px', borderBottom: '1px solid #e5dff0', background: '#f7f5fb', textAlign: 'center' }}>
            <img
              src={objectUrl}
              alt={pattern.title}
              style={{ maxWidth: '100%', maxHeight: 600, objectFit: 'contain', display: 'block', margin: '0 auto' }}
            />
          </div>
        )}
        {hasText && (
          <div style={{ marginBottom: 20, borderBottom: '1px solid #e5dff0', paddingBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#7c5cbf', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Pattern text
            </div>
            <pre style={{
              fontSize: 13, lineHeight: 1.7, color: '#2a2a3e',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              margin: 0, fontFamily: 'inherit',
              background: '#faf8fd', borderRadius: 8, padding: '14px 16px',
              border: '1px solid #e5dff0',
              maxHeight: hasPdf || hasImage ? 300 : 500,
              overflowY: 'auto',
            }}>
              {pattern.pdf_text}
            </pre>
          </div>
        )}

        {/* ── Parse button ── */}
        {hasText && (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={handleParse}
              disabled={parsing}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                background: parsed ? '#f0ebfa' : '#7c5cbf',
                color: parsed ? '#7c5cbf' : '#fff',
                border: parsed ? '1px solid #c9b8e8' : 'none',
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 15 }}>⚙</span>
              {parsing ? 'Parsing…' : parsed ? 'Re-parse pattern' : 'Parse pattern'}
            </button>

            {parsed && <ParseResult result={parsed} />}
          </div>
        )}

        {/* ── Metadata ── */}
        {metaRows.map(([label, val]) => val == null ? null : (
          <div key={label} style={{ display: 'flex', gap: 16, padding: '9px 0', borderBottom: '1px solid #f0ebfa' }}>
            <span style={{ width: 120, flexShrink: 0, fontSize: 12, color: '#999', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ opacity: 0.5, fontSize: 10 }}>≡</span> {label}
            </span>
            <span style={{ fontSize: 13, color: '#1a1a2e' }}>{val}</span>
          </div>
        ))}

        {skills.length > 0 && (
          <div style={{ padding: '12px 0', borderBottom: '1px solid #f0ebfa' }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ opacity: 0.5, fontSize: 10 }}>≡</span> Required skills
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map(s => (
                <span key={s} style={{ background: '#ede8f9', color: '#5a3fa0', padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 500 }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Yarns ── */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#7c5cbf', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Yarns in this pattern
          </div>
          {linkedYarns.length === 0 && (
            <div style={{ fontSize: 12, color: '#bbb', marginBottom: 12 }}>No yarns linked yet.</div>
          )}
          {linkedYarns.map(y => (
            <div key={y.yarn_id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: 7, background: '#f7f4fd', marginBottom: 6,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{y.yarn_name}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                  {[y.yarn_brand, WEIGHT_LABELS[y.yarn_weight] ?? y.yarn_weight].filter(Boolean).join(' · ')}
                  {y.is_substitution ? ' · Substitution' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#666' }}>{y.yardage ? `${y.yardage} yds` : '—'}</span>
                <button
                  onClick={() => handleRemoveYarn(y.yarn_id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 14, padding: 2, lineHeight: 1 }}
                  title="Remove yarn"
                >✕</button>
              </div>
            </div>
          ))}

          {!showAddYarn ? (
            <button onClick={() => setShowAddYarn(true)} style={ghostBtn}>+ Link yarn</button>
          ) : (
            <div style={{ border: '1px solid #e5dff0', borderRadius: 8, padding: 14, marginTop: 8 }}>
              <select value={selectedYarnId} onChange={e => setSelectedYarnId(e.target.value)} style={{ ...inputS, marginBottom: 8 }}>
                <option value="">Select a yarn…</option>
                {availableYarns.map(y => (
                  <option key={y.id} value={y.id}>{y.name}{y.brand ? ` — ${y.brand}` : ''}</option>
                ))}
              </select>
              <input type="number" min={0} placeholder="Yardage required (optional)"
                value={yarnYardage} onChange={e => setYarnYardage(e.target.value)}
                style={{ ...inputS, marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleAddYarn} disabled={addingYarn || !selectedYarnId} style={primaryBtn}>
                  {addingYarn ? 'Linking…' : 'Link'}
                </button>
                <button onClick={() => setShowAddYarn(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const formFileMime  = form.pdfPath ? mimeFromDataUrl(form.pdfPath) : null;
  const formHasPdf    = formFileMime === 'application/pdf';
  const formHasImage  = formFileMime?.startsWith('image/') ?? false;
  const formHasFile   = formHasPdf || formHasImage;

  const renderEdit = () => (
    <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Current file preview / drop zone */}
      {formHasFile ? (
        <div style={{ border: '1px solid #e5dff0', borderRadius: 8, overflow: 'hidden' }}>
          {formHasPdf && form.pdfPath && (
            <embed src={form.pdfPath} type="application/pdf"
              style={{ width: '100%', height: 220, display: 'block', border: 'none' }} />
          )}
          {formHasImage && form.pdfPath && (
            <img src={form.pdfPath} alt="Pattern" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', display: 'block' }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#faf8fd', borderTop: '1px solid #e5dff0' }}>
            <span style={{ fontSize: 12, color: '#888' }}>{formHasPdf ? 'PDF' : 'Image'} attached</span>
            <button type="button" onClick={() => set('pdfPath', undefined)} style={{ ...ghostBtn, fontSize: 11, padding: '2px 8px', color: '#c0392b', borderColor: '#c0392b' }}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#7c5cbf' : '#d8d0ea'}`, borderRadius: 8,
            padding: '18px 12px', cursor: 'pointer', background: dragOver ? '#f5f0ff' : '#faf8fd',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            fontSize: 12, color: '#999', textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 22 }}>📄</span>
          <span><strong style={{ color: '#7c5cbf' }}>Drop a file</strong> or click to browse</span>
          <span style={{ fontSize: 11 }}>PDF · PNG · JPG · plain text</span>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept=".pdf,.txt,.png,.jpg,.jpeg,.webp" multiple
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files) Array.from(e.target.files).forEach(ingestFile); }} />

      <Field label="Title *">
        <input style={inputS} value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
      </Field>
      <Field label="Designer">
        <input style={inputS} value={form.designer ?? ''} onChange={e => set('designer', e.target.value)} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Source type">
          <select style={inputS} value={form.sourceType} onChange={e => set('sourceType', e.target.value as PatternSourceType)}>
            {SOURCE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Source URL">
          <input style={inputS} value={form.sourceUrl ?? ''} onChange={e => set('sourceUrl', e.target.value)} placeholder="https://…" />
        </Field>
      </div>

      <div style={{ border: '1px solid #e5dff0', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#7c5cbf', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Called-for yarn specs
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Weight">
            <input style={inputS} value={form.calledForYarnWeight ?? ''} onChange={e => set('calledForYarnWeight', e.target.value)} placeholder="e.g. DK" />
          </Field>
          <Field label="Total yardage">
            <input style={inputS} type="number" min={0} value={form.calledForYardage ?? ''}
              onChange={e => set('calledForYardage', e.target.value === '' ? undefined : parseInt(e.target.value))} />
          </Field>
          <Field label="Gauge (sts/10cm)">
            <input style={inputS} type="number" min={0} step={0.5} value={form.calledForGaugeStitches ?? ''}
              onChange={e => set('calledForGaugeStitches', e.target.value === '' ? undefined : parseFloat(e.target.value))} />
          </Field>
          <Field label="Gauge (rows/10cm)">
            <input style={inputS} type="number" min={0} step={0.5} value={form.calledForGaugeRows ?? ''}
              onChange={e => set('calledForGaugeRows', e.target.value === '' ? undefined : parseFloat(e.target.value))} />
          </Field>
          <Field label="Needle size (mm)">
            <input style={inputS} type="number" min={0} step={0.25} value={form.calledForNeedleSizeMm ?? ''}
              onChange={e => set('calledForNeedleSizeMm', e.target.value === '' ? undefined : parseFloat(e.target.value))} />
          </Field>
        </div>
      </div>

      <Field label="Required skills">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SKILL_OPTIONS.map(s => {
            const active = (form.requiredSkills ?? []).includes(s);
            return (
              <button key={s} type="button" onClick={() => toggleSkill(s)}
                style={{
                  padding: '3px 10px', borderRadius: 10, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${active ? '#7c5cbf' : '#d8d0ea'}`,
                  background: active ? '#7c5cbf' : 'transparent',
                  color: active ? '#fff' : '#555', fontWeight: active ? 600 : 400,
                }}
              >{s}</button>
            );
          })}
        </div>
      </Field>

      <Field label="Pattern text">
        <textarea
          style={{ ...inputS, height: 120, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', fontSize: 13 }}
          placeholder="Paste pattern instructions here, or drop a .txt file above…"
          value={form.pdfText ?? ''}
          onChange={e => set('pdfText', e.target.value)}
        />
      </Field>

      <Field label="Notes">
        <textarea style={{ ...inputS, height: 60, resize: 'vertical' }}
          value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
      </Field>

      {error && <div style={{ color: '#c0392b', fontSize: 12 }}>{error}</div>}
    </form>
  );

  return (
    <div style={{
      width: panelWidth, flexShrink: 0, borderLeft: '1px solid #e5dff0',
      background: '#fff', display: 'flex', flexDirection: 'column', height: '100%',
      transition: 'width 0.2s ease',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', borderBottom: '1px solid #e5dff0', flexShrink: 0,
      }}>
        {!isNew && mode === 'view' && <button onClick={() => setMode('edit')} style={ghostBtn}>Edit</button>}
        {mode === 'edit' && !isNew && (
          <button onClick={() => { setMode('view'); setForm(toForm(pattern!)); setError(''); }} style={ghostBtn}>Cancel</button>
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
            {saving ? 'Saving…' : pattern ? 'Save Changes' : 'Add Pattern'}
          </button>
          {isNew && <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>}
        </div>
      )}
    </div>
  );
}

function ParseResult({ result }: { result: ParsedPattern }) {
  const metaRows: [string, string | null][] = [
    ['Yarn weight',   result.yarnWeight],
    ['Yardage',       result.yardage != null ? `${result.yardage} yds` : null],
    ['Gauge',         result.gaugeStitches != null
      ? `${result.gaugeStitches} sts${result.gaugeRows != null ? ` × ${result.gaugeRows} rows` : ''} / 10 cm`
      : null],
    ['Needle size',   result.needleSizeMm != null ? `${result.needleSizeMm} mm` : null],
  ];

  const hasAnything = metaRows.some(([, v]) => v != null) ||
    result.skills.length > 0 || result.sizes.length > 0 || result.sections.length > 0;

  if (!hasAnything) {
    return (
      <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: '#faf8fd', border: '1px solid #e5dff0', fontSize: 12, color: '#aaa' }}>
        Nothing extracted — pattern text may not follow standard formatting.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10, borderRadius: 8, border: '1px solid #c9b8e8', background: '#faf8fd', overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px', background: '#ede8f9', fontSize: 11, fontWeight: 600, color: '#5a3fa0', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>⚙</span> Parsed fields
        <span style={{ marginLeft: 'auto', fontWeight: 400, opacity: 0.6, textTransform: 'none', letterSpacing: 0 }}>placeholder — results not yet saved</span>
      </div>

      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {metaRows.map(([label, val]) => val == null ? null : (
          <div key={label} style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <span style={{ width: 100, flexShrink: 0, color: '#999' }}>{label}</span>
            <span style={{ color: '#1a1a2e', fontWeight: 500 }}>{val}</span>
          </div>
        ))}

        {result.sizes.length > 0 && (
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <span style={{ width: 100, flexShrink: 0, color: '#999' }}>Sizes</span>
            <span style={{ color: '#1a1a2e', fontWeight: 500 }}>{result.sizes.join(', ')}</span>
          </div>
        )}

        {result.skills.length > 0 && (
          <div style={{ display: 'flex', gap: 12, fontSize: 12, alignItems: 'flex-start' }}>
            <span style={{ width: 100, flexShrink: 0, color: '#999', paddingTop: 2 }}>Skills</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {result.skills.map(s => (
                <span key={s} style={{ background: '#ede8f9', color: '#5a3fa0', padding: '1px 8px', borderRadius: 8, fontSize: 11 }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {result.sections.length > 0 && (
          <div style={{ marginTop: 4, borderTop: '1px solid #e5dff0', paddingTop: 8 }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>Sections detected ({result.sections.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {result.sections.map((s, i) => (
                <span key={i} style={{ background: '#f0ebfa', color: '#666', padding: '2px 8px', borderRadius: 6, fontSize: 11 }}>
                  {s.label.length > 30 ? s.label.slice(0, 30) + '…' : s.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
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

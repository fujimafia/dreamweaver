import { useRef, useState } from 'react';
import type { Yarn, CreateYarnInput, YarnWeight } from '../db/types';

const WEIGHTS: YarnWeight[] = ['lace','fingering','sport','dk','worsted','aran','bulky','super_bulky'];
const WEIGHT_LABELS: Record<YarnWeight, string> = {
  lace: 'Lace', fingering: 'Fingering', sport: 'Sport', dk: 'DK',
  worsted: 'Worsted', aran: 'Aran', bulky: 'Bulky', super_bulky: 'Super Bulky',
};
const COLOR_FEATURES = ['Solid','Heather','Tweed','Variegated','Speckled','Marled'];

interface Props {
  yarn: Yarn | null;
  onSave: (input: CreateYarnInput) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

function toInput(y: Yarn): CreateYarnInput {
  return {
    name: y.name,
    brand: y.brand ?? undefined,
    fiberContent: y.fiber_content,
    weight: y.weight,
    gaugeStitches: y.gauge_stitches ?? undefined,
    gaugeRows: y.gauge_rows ?? undefined,
    needleSizeMm: y.needle_size_mm ?? undefined,
    yardagePerSkein: y.yardage_per_skein ?? undefined,
    metersPerSkein: y.meters_per_skein ?? undefined,
    skeinsOwned: y.skeins_owned,
    color: y.color ?? undefined,
    colorFeature: y.color_feature ?? undefined,
    colorway: y.colorway ?? undefined,
    dyeLot: y.dye_lot ?? undefined,
    pricePerSkein: y.price_per_skein ?? undefined,
    purchaseUrl: y.purchase_url ?? undefined,
    notes: y.notes ?? undefined,
    photos: y.photos ? JSON.parse(y.photos) : [],
  };
}

const EMPTY: CreateYarnInput = {
  name: '', fiberContent: '', weight: 'worsted', skeinsOwned: 0, photos: [],
};

export default function YarnPanel({ yarn, onSave, onDelete, onClose }: Props) {
  const [form, setForm]     = useState<CreateYarnInput>(yarn ? toInput(yarn) : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photos = form.photos ?? [];

  const set = (field: keyof CreateYarnInput, value: unknown) =>
    setForm(f => ({ ...f, [field]: value === '' ? undefined : value }));

  // Convert a File to a base64 data URL
  const readFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) { reject(new Error('Not an image')); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const results = await Promise.all(arr.map(readFile).map(p => p.catch(() => null)));
    const valid = results.filter(Boolean) as string[];
    setForm(f => ({ ...f, photos: [...(f.photos ?? []), ...valid] }));
  };

  const removePhoto = (idx: number) =>
    setForm(f => ({ ...f, photos: (f.photos ?? []).filter((_, i) => i !== idx) }));

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    await addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!form.name.trim())         { setError('Name is required.'); return; }
    if (!form.fiberContent.trim()) { setError('Fiber content is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  };

  return (
    <div style={{
      width: 360, flexShrink: 0, borderLeft: '1px solid #e5dff0',
      background: '#fff', display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid #e5dff0', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{yarn ? 'Edit Yarn' : 'New Yarn'}</span>
        <button onClick={onClose} style={iconBtn}>✕</button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Photos ── */}
        <Field label="Photos">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#7c5cbf' : '#d8d0ea'}`,
              borderRadius: 8, padding: '12px 10px', cursor: 'pointer',
              background: dragOver ? '#f5f0ff' : '#faf8fd',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 12, color: '#999', transition: 'border-color 0.15s, background 0.15s',
              minHeight: 48,
            }}
          >
            <span style={{ fontSize: 16 }}>📷</span>
            <span>Drop images or click to browse</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => e.target.files && addFiles(e.target.files)}
          />

          {/* Thumbnails */}
          {photos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {photos.map((src, idx) => (
                <div key={idx} style={{ position: 'relative', width: 72, height: 72 }}>
                  <img
                    src={src}
                    alt={`yarn photo ${idx + 1}`}
                    style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5dff0' }}
                  />
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); removePhoto(idx); }}
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#c0392b', color: '#fff', border: 'none',
                      fontSize: 10, cursor: 'pointer', lineHeight: '18px', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >✕</button>
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
              onChange={e => set('skeinsOwned', e.target.value === '' ? 0 : parseFloat(e.target.value))} />
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

      {/* Footer */}
      <div style={{
        padding: '12px 20px', borderTop: '1px solid #e5dff0', flexShrink: 0,
        display: 'flex', gap: 8, background: '#fff',
      }}>
        <button type="button" onClick={handleSubmit} disabled={saving} style={primaryBtn}>
          {saving ? 'Saving…' : yarn ? 'Save Changes' : 'Add Yarn'}
        </button>
        <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
        {onDelete && (
          <button type="button" onClick={onDelete} style={{ ...ghostBtn, marginLeft: 'auto', color: '#c0392b', borderColor: '#c0392b' }}>
            Delete
          </button>
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
  padding: '7px 14px', background: 'transparent', color: '#555',
  border: '1px solid #d8d0ea', borderRadius: 6, fontSize: 13, cursor: 'pointer',
};
const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 16, color: '#999', lineHeight: 1, padding: 4,
};

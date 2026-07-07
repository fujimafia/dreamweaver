import { useState } from 'react';
import type { Garment, UpdateGarmentInput } from '../db/types';

const GARMENT_TYPES = [
  'Sweater', 'Cardigan', 'Vest', 'Shawl', 'Scarf', 'Hat', 'Mittens',
  'Socks', 'Blanket', 'Bag', 'Top', 'Dress', 'Other',
];
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'All Seasons'];

interface Props {
  garment: Garment;
  projectTitle?: string;
  onSave: (input: UpdateGarmentInput) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

function toForm(g: Garment): UpdateGarmentInput {
  return {
    garmentType: g.garment_type ?? undefined,
    season: g.season ?? undefined,
    careInstructions: g.care_instructions ?? undefined,
    isGift: !!g.is_gift,
    giftRecipient: g.gift_recipient ?? undefined,
    giftNotes: g.gift_notes ?? undefined,
    processNotes: g.process_notes ?? undefined,
  };
}

export default function GarmentPanel({ garment, projectTitle, onSave, onDelete, onClose }: Props) {
  const [mode, setMode]     = useState<'view' | 'edit'>('edit');
  const [form, setForm]     = useState<UpdateGarmentInput>(toForm(garment));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (field: keyof UpdateGarmentInput, value: unknown) =>
    setForm(f => ({ ...f, [field]: value === '' ? undefined : value }));

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await onSave(form);
      setMode('view');
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const renderView = () => {
    const rows: [string, React.ReactNode][] = [
      ['Garment Type',  garment.garment_type],
      ['Season',        garment.season],
      ['Care',          garment.care_instructions],
      ['Gift',          garment.is_gift ? (garment.gift_recipient ? `Yes — for ${garment.gift_recipient}` : 'Yes') : 'No'],
      ['Gift Notes',    garment.is_gift ? garment.gift_notes : null],
      ['Process Notes', garment.process_notes],
    ];
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        <h2 style={{ margin: '20px 0 20px', fontSize: 26, fontWeight: 800, color: '#1a1a2e' }}>
          {projectTitle ?? 'Garment'}
        </h2>
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
      {projectTitle && (
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', paddingBottom: 8, borderBottom: '2px solid #f0ebfa' }}>
          {projectTitle}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Garment Type">
          <select style={inputS} value={form.garmentType ?? ''} onChange={e => set('garmentType', e.target.value)}>
            <option value="">—</option>
            {GARMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Season">
          <select style={inputS} value={form.season ?? ''} onChange={e => set('season', e.target.value)}>
            <option value="">—</option>
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Care Instructions">
        <textarea
          style={{ ...inputS, height: 72, resize: 'vertical' }}
          placeholder="e.g. Hand wash cold, lay flat to dry"
          value={form.careInstructions ?? ''}
          onChange={e => set('careInstructions', e.target.value)}
        />
      </Field>

      <div style={{ border: '1px solid #e5dff0', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
          <input type="checkbox" checked={!!form.isGift} onChange={e => set('isGift', e.target.checked)} />
          This is a gift
        </label>
        {form.isGift && (
          <>
            <Field label="Recipient">
              <input style={inputS} value={form.giftRecipient ?? ''} onChange={e => set('giftRecipient', e.target.value)} placeholder="Name" />
            </Field>
            <Field label="Gift Notes">
              <textarea
                style={{ ...inputS, height: 56, resize: 'vertical' }}
                placeholder="Colour / fit preferences…"
                value={form.giftNotes ?? ''}
                onChange={e => set('giftNotes', e.target.value)}
              />
            </Field>
          </>
        )}
      </div>

      <Field label="Process Notes">
        <textarea style={{ ...inputS, height: 72, resize: 'vertical' }}
          value={form.processNotes ?? ''}
          onChange={e => set('processNotes', e.target.value)} />
      </Field>

      {error && <div style={{ color: '#c0392b', fontSize: 12 }}>{error}</div>}
    </form>
  );

  return (
    <div style={{
      width: 380, flexShrink: 0, borderLeft: '1px solid #e5dff0',
      background: '#fff', display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', borderBottom: '1px solid #e5dff0', flexShrink: 0,
      }}>
        {mode === 'view' && <button onClick={() => setMode('edit')} style={ghostBtn}>Edit</button>}
        {mode === 'edit' && (
          <button onClick={() => { setMode('view'); setForm(toForm(garment)); setError(''); }} style={ghostBtn}>Cancel</button>
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
            {saving ? 'Saving…' : 'Save Garment'}
          </button>
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

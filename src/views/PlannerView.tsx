import { useEffect, useState } from 'react';
import { listProjects } from '../db/projects';
import type { Project } from '../db/types';

// ── Colour palette ────────────────────────────────────────────────────────────

const PURPLE_BG   = '#7c5cbf';
const PURPLE_MUTE = '#a89dc0';
const AMBER       = '#e8a020';   // planned end-date emphasis colour
const PAGE_BG     = '#f7f5fb';
const HEADER_BG   = '#1a1a2e';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate();
}

function inRange(day: Date, start: Date | null, end: Date | null) {
  if (!start && !end) return false;
  const s = start ?? end!;
  const e = end   ?? start!;
  return day >= s && day <= e;
}

// Status badge colours
function statusColor(status: string): string {
  switch (status) {
    case 'in_progress':  return PURPLE_BG;
    case 'planned':      return '#5a9e6f';
    case 'paused':       return '#8a7a9e';
    case 'completed':    return '#3a8ab5';
    case 'ready_to_wear':return '#b55a8a';
    default: return PURPLE_MUTE;
  }
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

// Projects visible on the planner:
//  - in_progress always (even without explicit planner dates)
//  - any other status only if at least one planner date is set
function plannerProjects(projects: Project[]): Project[] {
  return projects.filter(p =>
    p.status === 'in_progress' ||
    p.planner_start_date != null ||
    p.planner_end_date   != null
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlannerView() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [projects, setProjects] = useState<Project[]>([]);
  const [hovered, setHovered]  = useState<string | null>(null);

  useEffect(() => {
    listProjects().then(ps => setProjects(plannerProjects(ps)));
  }, []);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else              setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else               setMonth(m => m + 1);
  };

  const numDays  = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  // Build a 6×7 grid of Date|null cells
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  // For each day cell, which projects touch it?
  function projectsForDay(day: Date): Project[] {
    return projects.filter(p => {
      const s = toDate(p.planner_start_date);
      const e = toDate(p.planner_end_date);
      return inRange(day, s, e);
    });
  }

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'system-ui, sans-serif', background: PAGE_BG, minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>Planner</h2>
        <div style={{ flex: 1 }} />
        <button onClick={prevMonth} style={navBtnStyle}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e', minWidth: 140, textAlign: 'center' }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} style={navBtnStyle}>›</button>
      </div>

      {/* ── Legend ── */}
      {projects.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginBottom: 20 }}>
          {projects.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: 2,
                background: statusColor(p.status), flexShrink: 0,
              }} />
              <span style={{ color: '#1a1a2e', fontWeight: 500 }}>{p.title}</span>
              <span style={{
                background: statusColor(p.status), color: '#fff',
                borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 500,
              }}>{statusLabel(p.status)}</span>
              {p.planner_end_date && (
                <span style={{ color: AMBER, fontWeight: 600, fontSize: 11 }}>
                  due {p.planner_end_date}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Calendar grid ── */}
      <div style={{
        borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(124,92,191,0.10)',
        border: '1px solid #e0d8f0',
      }}>
        {/* Day-of-week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: HEADER_BG }}>
          {DAYS.map(d => (
            <div key={d} style={{
              padding: '10px 0', textAlign: 'center',
              fontSize: 12, fontWeight: 600, color: '#c9b8e8', letterSpacing: '0.04em',
            }}>{d}</div>
          ))}
        </div>

        {/* Weeks */}
        {Array.from({ length: cells.length / 7 }, (_, week) => (
          <div key={week} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.slice(week * 7, week * 7 + 7).map((day, col) => {
              const isToday = day ? sameDay(day, today) : false;
              const dayProjects = day ? projectsForDay(day) : [];

              return (
                <div
                  key={col}
                  style={{
                    minHeight: 88,
                    padding: '6px 8px',
                    background: day ? '#ffffff' : '#f3f0f8',
                    borderRight: col < 6 ? '1px solid #ede8f5' : undefined,
                    borderBottom: '1px solid #ede8f5',
                    position: 'relative',
                  }}
                >
                  {/* Day number */}
                  {day && (
                    <div style={{
                      fontSize: 12, fontWeight: isToday ? 700 : 400,
                      color: isToday ? '#ffffff' : '#6b5a8a',
                      background: isToday ? PURPLE_BG : undefined,
                      borderRadius: isToday ? '50%' : undefined,
                      width: 22, height: 22,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 4,
                    }}>{day.getDate()}</div>
                  )}

                  {/* Project bars */}
                  {dayProjects.map(p => {
                    const s = toDate(p.planner_start_date);
                    const e = toDate(p.planner_end_date);
                    const isEnd   = e && day ? sameDay(day, e) : false;
                    const isStart = s && day ? sameDay(day, s) : false;
                    const isHov   = hovered === p.id;

                    return (
                      <div
                        key={p.id}
                        onMouseEnter={() => setHovered(p.id)}
                        onMouseLeave={() => setHovered(null)}
                        title={`${p.title}${p.planner_end_date ? ' · due ' + p.planner_end_date : ''}`}
                        style={{
                          background: isEnd ? AMBER : statusColor(p.status),
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: isEnd ? 700 : 500,
                          padding: '2px 5px',
                          borderRadius: isStart ? '4px 0 0 4px' : isEnd ? '0 4px 4px 0' : 0,
                          marginBottom: 2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          opacity: isHov ? 0.85 : 1,
                          cursor: 'default',
                          boxShadow: isEnd ? `0 0 0 2px ${AMBER}55` : undefined,
                          outline: isEnd ? `1.5px solid ${AMBER}` : undefined,
                        }}
                      >
                        {(isStart || day?.getDate() === 1) ? p.title : ''}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Empty state ── */}
      {projects.length === 0 && (
        <div style={{ marginTop: 48, textAlign: 'center', color: PURPLE_MUTE, fontSize: 14 }}>
          No projects scheduled yet.<br />
          Add planner dates to a project to see it here.
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: '#ede8f5',
  border: 'none',
  borderRadius: 6,
  width: 32, height: 32,
  cursor: 'pointer',
  fontSize: 18,
  color: '#6b5a8a',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1,
};

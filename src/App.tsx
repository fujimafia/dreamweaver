import { useState } from 'react';
import { NAV_ITEMS, type NavSection } from './nav';
import YarnView from './views/YarnView';
import ProjectView from './views/ProjectView';
import PatternView from './views/PatternView';
import GarmentView from './views/GarmentView';
import InspirationView from './views/InspirationView';

export interface NavigateOpts {
  projectId?: string;
  garmentId?: string;
  patternId?: string;
}

export default function App() {
  const [active, setActive]           = useState<NavSection>('yarn');
  const [navOpts, setNavOpts]         = useState<NavigateOpts>({});

  const navigate = (section: NavSection, opts: NavigateOpts = {}) => {
    setNavOpts(opts);
    setActive(section);
  };

  // Clear opts when user manually clicks a nav item
  const handleNavClick = (section: NavSection) => {
    setNavOpts({});
    setActive(section);
  };

  const renderView = () => {
    switch (active) {
      case 'yarn':    return <YarnView onNavigate={navigate} />;
      case 'project': return <ProjectView initialProjectId={navOpts.projectId} onNavigate={navigate} />;
      case 'pattern': return <PatternView initialPatternId={navOpts.patternId} />;
      case 'garment':      return <GarmentView initialGarmentId={navOpts.garmentId} />;
      case 'inspiration':  return <InspirationView />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <nav style={{
        width: 180, background: '#1a1a2e', color: '#e8e0f0',
        display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0,
      }}>
        <div style={{ padding: '0 20px 24px', fontSize: 18, fontWeight: 700, color: '#c9b8e8' }}>
          Dreamweaver
        </div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            style={{
              background: active === item.id ? '#2d2b55' : 'transparent',
              color: active === item.id ? '#c9b8e8' : '#a89dc0',
              border: 'none', textAlign: 'left', padding: '10px 20px',
              fontSize: 14, fontWeight: active === item.id ? 600 : 400,
              cursor: 'pointer',
              borderLeft: active === item.id ? '3px solid #7c5cbf' : '3px solid transparent',
            }}
          >{item.label}</button>
        ))}
      </nav>

      <main style={{ flex: 1, overflow: 'auto', background: '#f7f5fb' }}>
        {renderView()}
      </main>
    </div>
  );
}

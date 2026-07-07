export type NavSection = 'yarn' | 'project' | 'pattern' | 'garment' | 'inspiration';

export const NAV_ITEMS: { id: NavSection; label: string }[] = [
  { id: 'yarn',        label: 'Yarn'        },
  { id: 'project',     label: 'Project'     },
  { id: 'pattern',     label: 'Pattern'     },
  { id: 'garment',     label: 'Garment'     },
  { id: 'inspiration', label: 'Inspiration' },
];

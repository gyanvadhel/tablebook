export const STALL_DEFAULTS = {
  single: { width: 4, height: 2, label: 'Single Table (-)', size: 'small', shape: 'rect' },
  double: { width: 8, height: 2, label: 'Double Table (--)', size: 'medium', shape: 'rect' },
  'L-Stall': { width: 6, height: 4, label: 'L-Stall (L)', size: 'large', shape: 'L-Stall' },
  'L-Stall-Inverted': { width: 6, height: 4, label: 'L-Inverted (⅃)', size: 'large', shape: 'L-Stall-Inverted' },
  'T-Stall': { width: 6, height: 4, label: 'T-Stall (T)', size: 'large', shape: 'T-Stall' },
  'Pod': { width: 8, height: 4, label: 'Pod Cluster (4-Pack)', size: 'xlarge', shape: 'Pod' },
};

export const SNAP_GRID_FT: Record<string, string> = {
  '1': '1 ft',
  '0.5': '6 in',
  '0.25': '3 in',
  '0': 'Off',
};

export const WALL_THICKNESS_FT = 0.8;
export const ELEMENT_OUTSIDE_MARGIN_FT = 30;

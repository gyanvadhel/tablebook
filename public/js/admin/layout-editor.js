/**
 * TableBook — Architectural Floor Plan Studio
 * CAD wood floor textures, teak/oak tables, dynamic distance dimension lines,
 * curved rotation arc handles, wall-cutout doors/windows, and dark floating toolbar.
 *
 * Supports placing text signs, entrance markers, project name badge, and structures inside or OUTSIDE the hall frame.
 *
 * Every dimension held on an object (x, y, width, height) is stored in FEET.
 * Feet become SVG drawing units only at the render boundary, via px().
 */

// Stall footprints in feet
const STALL_DEFAULTS = {
  single:             { width: 4, height: 2, label: 'Single Table (-)', size: 'small', shape: 'rect' },
  double:             { width: 8, height: 2, label: 'Double Table (--)', size: 'medium', shape: 'rect' },
  'L-Stall':          { width: 6, height: 4, label: 'L-Stall (L)', size: 'large', shape: 'L-Stall' },
  'L-Stall-Inverted': { width: 6, height: 4, label: 'L-Inverted (⅃)', size: 'large', shape: 'L-Stall-Inverted' },
  'T-Stall':          { width: 6, height: 4, label: 'T-Stall (T)', size: 'large', shape: 'T-Stall' },
  'Pod':              { width: 8, height: 4, label: 'Pod Cluster (4-Pack)', size: 'xlarge', shape: 'Pod' }
};

const SNAP_GRID_FT = { '1': '1 ft', '0.5': '6 in', '0.25': '3 in', '0': 'Off' };
const HALL_PADDING_FT = 18; // Generous view padding around hall to comfortably see outside signs
const ELEMENT_OUTSIDE_MARGIN_FT = 30; // Max allowed distance to place signage outside the hall perimeter
const WALL_THICKNESS_FT = 0.8; // ~10 inches architectural wall thickness

const layoutEditor = {
  svg: null,
  canvas: null,
  eventId: null,
  eventData: null,
  tables: [],
  elements: [],
  selectedItem: null, // { type: 'table' | 'element', obj: ... }
  directoryFilter: 'all',

  // Snap & Guide Settings (feet)
  snapGridFt: 1,
  smartGuidesEnabled: true,
  snapThresholdFt: 0.4,

  // Drag & Interaction state
  isDragging: false,
  dragTarget: null,
  dragOffset: { x: 0, y: 0 },
  isRotatingArc: false,

  // View state — SVG drawing units
  viewBox: { x: 0, y: 0, w: 1200, h: 800 },
  originalViewBox: { x: 0, y: 0, w: 1200, h: 800 },
  isPanning: false,
  panStart: { x: 0, y: 0 },

  /** Feet to SVG drawing units. */
  px(ft) {
    return Units.ftToPx(ft);
  },

  hallWidthFt() {
    return Units.toFeet(this.eventData && this.eventData.hall_width, Units.DEFAULT_HALL_WIDTH_FT);
  },

  hallHeightFt() {
    return Units.toFeet(this.eventData && this.eventData.hall_height, Units.DEFAULT_HALL_HEIGHT_FT);
  },

  getNextAvailableTableNum() {
    const existingNums = new Set();
    this.tables.forEach(t => {
      const num = parseInt(t.table_number);
      if (!isNaN(num) && num > 0) existingNums.add(num);
    });

    let nextNum = 1;
    while (existingNums.has(nextNum)) nextNum++;
    return String(nextNum);
  },

  ensureRoomBadgeElement() {
    let badge = this.elements.find(el => el.type === 'room_badge');
    if (!badge) {
      badge = {
        id: 'room_badge_main',
        type: 'room_badge',
        label: this.eventData.name || 'Main Hall',
        x: 1.5,
        y: 1.5,
        width: 8,
        height: 3,
        rotation: 0
      };
      this.elements.unshift(badge);
    }
  },

  async init() {
    this.svg = document.getElementById('editor-svg');
    this.canvas = document.getElementById('editor-canvas');

    const urlParams = new URLSearchParams(window.location.search);
    this.eventId = urlParams.get('id');

    if (!this.eventId) {
      window.location.href = '/admin/events.html';
      return;
    }

    try {
      const eventRes = await fetch('/api/admin/events');
      if (!eventRes.ok) {
        if (eventRes.status === 401) {
          window.location.href = '/admin/login.html';
          return;
        }
        throw new Error('Failed to fetch events');
      }
      const events = await eventRes.json();
      this.eventData = Array.isArray(events) ? events.find(e => String(e.id) === String(this.eventId)) : null;

      if (!this.eventData) {
        showToast('Event not found', 'error');
        document.getElementById('editor-subtitle').textContent = 'Event not found. Return to Exhibitions list.';
        return;
      }

      if (this.eventData.hall_elements) {
        try {
          this.elements = Array.isArray(this.eventData.hall_elements)
            ? this.eventData.hall_elements
            : JSON.parse(this.eventData.hall_elements);
        } catch (e) {
          this.elements = [];
        }
      } else {
        this.elements = [];
      }

      this.elements.forEach((el, idx) => {
        if (!el.id && !el._tempId) {
          el.id = 'elem_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 5);
        }
      });

      this.ensureRoomBadgeElement();
      this.updateHeaderInfo();

      const tablesRes = await fetch(`/api/admin/events/${this.eventId}/tables`);
      if (!tablesRes.ok) throw new Error('Failed to load stalls');
      const tablesData = await tablesRes.json();
      this.tables = Array.isArray(tablesData) ? tablesData : [];

      this.tables.forEach((t, idx) => {
        if (!t.id && !t._tempId) {
          t._tempId = 'table_' + Date.now() + '_' + idx;
        }
      });

      this.setupViewBox();
      this.renderHall();
      this.renderAllObjects();
      this.updateDirectoryList();
      this.bindEvents();

    } catch (err) {
      console.error('Editor init error:', err);
      showToast('Failed to load layout editor', 'error');
    }
  },

  updateHeaderInfo() {
    if (!this.eventData) return;
    document.getElementById('editor-title').textContent = `Floor Plan: ${this.eventData.name}`;
    const hallW = this.hallWidthFt();
    const hallH = this.hallHeightFt();
    const badge = document.getElementById('hall-dimension-badge');
    if (badge) {
      badge.textContent = `${Units.formatDims(hallW, hallH)} · ${Units.formatArea(hallW, hallH)}`;
    }
    document.getElementById('editor-subtitle').textContent =
      `${this.eventData.venue || 'Venue TBD'} · Real-World Architectural Scale`;
  },

  setupViewBox() {
    const hallW = this.hallWidthFt();
    const hallH = this.hallHeightFt();

    // Include bounds of elements placed outside the hall
    let minXFt = 0;
    let minYFt = 0;
    let maxXFt = hallW;
    let maxYFt = hallH;

    this.elements.forEach(el => {
      const ex = el.x || 0;
      const ey = el.y || 0;
      const ew = el.width || 4;
      const eh = el.height || 2;
      if (ex < minXFt) minXFt = ex;
      if (ey < minYFt) minYFt = ey;
      if (ex + ew > maxXFt) maxXFt = ex + ew;
      if (ey + eh > maxYFt) maxYFt = ey + eh;
    });

    this.tables.forEach(t => {
      const tx = t.x || 0;
      const ty = t.y || 0;
      const tw = t.width || 4;
      const th = t.height || 2;
      if (tx < minXFt) minXFt = tx;
      if (ty < minYFt) minYFt = ty;
      if (tx + tw > maxXFt) maxXFt = tx + tw;
      if (ty + th > maxYFt) maxYFt = ty + th;
    });

    const padding = this.px(HALL_PADDING_FT);
    const minX = this.px(minXFt) - padding;
    const minY = this.px(minYFt) - padding;
    const totalW = this.px(maxXFt - minXFt) + padding * 2;
    const totalH = this.px(maxYFt - minYFt) + padding * 2;

    this.viewBox = { x: minX, y: minY, w: totalW, h: totalH };
    this.originalViewBox = { ...this.viewBox };
    this.applyViewBox();
  },

  applyViewBox() {
    this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
    this.updateFloatingActionsPosition();
  },

  /* ----------------------------------------------------
     WHOLE-FLOOR ROTATION ENGINE (90° CW, 90° CCW, 180°)
     ---------------------------------------------------- */
  toggleFloorRotateMenu() {
    const menu = document.getElementById('floor-rotate-menu');
    if (menu) menu.classList.toggle('hidden');
  },

  closeFloorRotateMenu() {
    const menu = document.getElementById('floor-rotate-menu');
    if (menu) menu.classList.add('hidden');
  },

  rotateEntireFloor(mode = 'cw') {
    this.closeFloorRotateMenu();
    if (!this.eventData) return;

    const oldW = this.hallWidthFt();
    const oldH = this.hallHeightFt();

    if (mode === '180') {
      this.tables.forEach(t => {
        t.x = Units.roundFt(oldW - (t.x + t.width));
        t.y = Units.roundFt(oldH - (t.y + t.height));
        t.rotation = ((t.rotation || 0) + 180) % 360;
      });

      this.elements.forEach(el => {
        const w = el.width || 4;
        const h = el.height || 2;
        el.x = Units.roundFt(oldW - (el.x + w));
        el.y = Units.roundFt(oldH - (el.y + h));
        el.rotation = ((el.rotation || 0) + 180) % 360;
      });

      showToast('Whole floor rotated 180°', 'success');
    } else if (mode === 'cw') {
      const newW = oldH;
      const newH = oldW;

      this.tables.forEach(t => {
        const oldX = t.x;
        const oldY = t.y;
        const oldTableW = t.width;
        const oldTableH = t.height;

        t.x = Units.roundFt(oldH - (oldY + oldTableH));
        t.y = Units.roundFt(oldX);
        t.width = oldTableH;
        t.height = oldTableW;
        t.rotation = ((t.rotation || 0) + 90) % 360;
      });

      this.elements.forEach(el => {
        const oldX = el.x;
        const oldY = el.y;
        const elemW = el.width || 4;
        const elemH = el.height || 2;

        el.x = Units.roundFt(oldH - (oldY + elemH));
        el.y = Units.roundFt(oldX);
        el.width = elemH;
        el.height = elemW;
        el.rotation = ((el.rotation || 0) + 90) % 360;
      });

      this.eventData.hall_width = newW;
      this.eventData.hall_height = newH;

      showToast(`Whole floor rotated 90° Clockwise (${Units.formatDims(newW, newH)})`, 'success');
    } else if (mode === 'ccw') {
      const newW = oldH;
      const newH = oldW;

      this.tables.forEach(t => {
        const oldX = t.x;
        const oldY = t.y;
        const oldTableW = t.width;
        const oldTableH = t.height;

        t.x = Units.roundFt(oldY);
        t.y = Units.roundFt(oldW - (oldX + oldTableW));
        t.width = oldTableH;
        t.height = oldTableW;
        t.rotation = ((t.rotation || 0) + 270) % 360;
      });

      this.elements.forEach(el => {
        const oldX = el.x;
        const oldY = el.y;
        const elemW = el.width || 4;
        const elemH = el.height || 2;

        el.x = Units.roundFt(oldY);
        el.y = Units.roundFt(oldW - (oldX + elemW));
        el.width = elemH;
        el.height = elemW;
        el.rotation = ((el.rotation || 0) + 270) % 360;
      });

      this.eventData.hall_width = newW;
      this.eventData.hall_height = newH;

      showToast(`Whole floor rotated 90° Counter-Clockwise (${Units.formatDims(newW, newH)})`, 'success');
    }

    this.updateHeaderInfo();
    this.setupViewBox();
    this.renderHall();
    this.renderAllObjects();
    this.updateDirectoryList();
    if (this.selectedItem) {
      this.showProperties(this.selectedItem);
    }
  },

  /* ----------------------------------------------------
     HALL RENDERING & ARCHITECTURAL CAD TEXTURES & WALLS
     ---------------------------------------------------- */
  renderHall() {
    const widthFt = this.hallWidthFt();
    const heightFt = this.hallHeightFt();
    const w = this.px(widthFt);
    const h = this.px(heightFt);
    const wallThick = this.px(WALL_THICKNESS_FT);
    const ns = 'http://www.w3.org/2000/svg';

    this.svg.innerHTML = '';

    // Defs: Wood Floor Pattern, Honey Oak Wood Material, Arrow Markers
    const defs = document.createElementNS(ns, 'defs');

    // Canvas Background Grid Pattern (1 ft & 5 ft)
    const minor = this.px(1);
    const major = this.px(5);
    const gridPattern = document.createElementNS(ns, 'pattern');
    gridPattern.setAttribute('id', 'canvas-bg-grid');
    gridPattern.setAttribute('width', major);
    gridPattern.setAttribute('height', major);
    gridPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    gridPattern.innerHTML = `
      <rect width="${major}" height="${major}" fill="#f4f5f7"/>
      <path d="M ${minor} 0 L 0 0 0 ${minor} M ${minor*2} 0 L 0 0 0 ${minor*2} M ${minor*3} 0 L 0 0 0 ${minor*3} M ${minor*4} 0 L 0 0 0 ${minor*4}" fill="none" stroke="#e6e9ee" stroke-width="0.8"/>
      <path d="M ${major} 0 L 0 0 0 ${major}" fill="none" stroke="#d5dbe3" stroke-width="1.2"/>
    `;
    defs.appendChild(gridPattern);

    // Warm Architectural Hardwood Floor Parquet Pattern
    const plankW = this.px(16);
    const plankH = this.px(2);
    const woodFloorPattern = document.createElementNS(ns, 'pattern');
    woodFloorPattern.setAttribute('id', 'wood-floor-texture');
    woodFloorPattern.setAttribute('width', plankW);
    woodFloorPattern.setAttribute('height', plankH * 2);
    woodFloorPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    woodFloorPattern.innerHTML = `
      <rect width="${plankW}" height="${plankH * 2}" fill="#ded4c5"/>
      <line x1="0" y1="${plankH}" x2="${plankW}" y2="${plankH}" stroke="#cfc3b1" stroke-width="1"/>
      <line x1="0" y1="${plankH * 2}" x2="${plankW}" y2="${plankH * 2}" stroke="#cfc3b1" stroke-width="1"/>
      <line x1="${plankW / 2}" y1="0" x2="${plankW / 2}" y2="${plankH}" stroke="#cfc3b1" stroke-width="0.8"/>
      <line x1="${plankW}" y1="${plankH}" x2="${plankW}" y2="${plankH * 2}" stroke="#cfc3b1" stroke-width="0.8"/>
      <line x1="0" y1="${plankH}" x2="0" y2="${plankH * 2}" stroke="#cfc3b1" stroke-width="0.8"/>
    `;
    defs.appendChild(woodFloorPattern);

    // Honey Oak Table Wood Pattern (Available)
    const tableWood = document.createElementNS(ns, 'pattern');
    tableWood.setAttribute('id', 'honey-oak-table');
    tableWood.setAttribute('width', this.px(4));
    tableWood.setAttribute('height', this.px(2));
    tableWood.setAttribute('patternUnits', 'userSpaceOnUse');
    tableWood.innerHTML = `
      <rect width="${this.px(4)}" height="${this.px(2)}" fill="#c98a46"/>
      <line x1="0" y1="${this.px(1)}" x2="${this.px(4)}" y2="${this.px(1)}" stroke="#b87733" stroke-width="0.8" stroke-dasharray="8 2"/>
    `;
    defs.appendChild(tableWood);

    // Booked Table Crimson Red Pattern
    const tableBooked = document.createElementNS(ns, 'pattern');
    tableBooked.setAttribute('id', 'honey-oak-table-booked');
    tableBooked.setAttribute('width', this.px(4));
    tableBooked.setAttribute('height', this.px(2));
    tableBooked.setAttribute('patternUnits', 'userSpaceOnUse');
    tableBooked.innerHTML = `
      <rect width="${this.px(4)}" height="${this.px(2)}" fill="#e11d48"/>
      <line x1="0" y1="${this.px(1)}" x2="${this.px(4)}" y2="${this.px(1)}" stroke="#be123c" stroke-width="0.8" stroke-dasharray="8 2"/>
    `;
    defs.appendChild(tableBooked);

    // Double-headed rotation arrow marker
    const markerStart = document.createElementNS(ns, 'marker');
    markerStart.setAttribute('id', 'rot-arrow-start');
    markerStart.setAttribute('viewBox', '0 0 10 10');
    markerStart.setAttribute('refX', '5');
    markerStart.setAttribute('refY', '5');
    markerStart.setAttribute('markerWidth', '6');
    markerStart.setAttribute('markerHeight', '6');
    markerStart.setAttribute('orient', 'auto-start-reverse');
    markerStart.innerHTML = `<path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6"/>`;
    defs.appendChild(markerStart);

    const markerEnd = document.createElementNS(ns, 'marker');
    markerEnd.setAttribute('id', 'rot-arrow-end');
    markerEnd.setAttribute('viewBox', '0 0 10 10');
    markerEnd.setAttribute('refX', '5');
    markerEnd.setAttribute('refY', '5');
    markerEnd.setAttribute('markerWidth', '6');
    markerEnd.setAttribute('markerHeight', '6');
    markerEnd.setAttribute('orient', 'auto');
    markerEnd.innerHTML = `<path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6"/>`;
    defs.appendChild(markerEnd);

    this.svg.appendChild(defs);

    // Expansive Background Canvas Grid (Accommodates outside signs)
    const bgCanvas = document.createElementNS(ns, 'rect');
    bgCanvas.setAttribute('x', -this.px(60)); bgCanvas.setAttribute('y', -this.px(60));
    bgCanvas.setAttribute('width', w + this.px(120)); bgCanvas.setAttribute('height', h + this.px(120));
    bgCanvas.setAttribute('fill', 'url(#canvas-bg-grid)');
    this.svg.appendChild(bgCanvas);

    // Architectural Perimeter Thick Wall (Solid slate fill + dark outer outline)
    const wallOuter = document.createElementNS(ns, 'rect');
    wallOuter.setAttribute('x', -wallThick);
    wallOuter.setAttribute('y', -wallThick);
    wallOuter.setAttribute('width', w + wallThick * 2);
    wallOuter.setAttribute('height', h + wallThick * 2);
    wallOuter.setAttribute('fill', '#475569');
    wallOuter.setAttribute('stroke', '#1e293b');
    wallOuter.setAttribute('stroke-width', '1.5');
    wallOuter.setAttribute('rx', '2');
    this.svg.appendChild(wallOuter);

    // Hardwood Floor Plan Interior
    const floor = document.createElementNS(ns, 'rect');
    floor.setAttribute('x', '0'); floor.setAttribute('y', '0');
    floor.setAttribute('width', w); floor.setAttribute('height', h);
    floor.setAttribute('fill', 'url(#wood-floor-texture)');
    floor.setAttribute('stroke', '#1e293b');
    floor.setAttribute('stroke-width', '1.5');
    this.svg.appendChild(floor);

    // Architectural Layer Groups
    const structuresLayer = document.createElementNS(ns, 'g');
    structuresLayer.setAttribute('id', 'editor-structures-layer');
    this.svg.appendChild(structuresLayer);

    const tablesLayer = document.createElementNS(ns, 'g');
    tablesLayer.setAttribute('id', 'editor-tables-layer');
    this.svg.appendChild(tablesLayer);

    const doorsLayer = document.createElementNS(ns, 'g');
    doorsLayer.setAttribute('id', 'editor-doors-layer');
    this.svg.appendChild(doorsLayer);

    const textLayer = document.createElementNS(ns, 'g');
    textLayer.setAttribute('id', 'editor-text-layer');
    this.svg.appendChild(textLayer);

    const dimensionsLayer = document.createElementNS(ns, 'g');
    dimensionsLayer.setAttribute('id', 'editor-dimensions-layer');
    this.svg.appendChild(dimensionsLayer);

    const guidesLayer = document.createElementNS(ns, 'g');
    guidesLayer.setAttribute('id', 'editor-guides-layer');
    this.svg.appendChild(guidesLayer);
  },

  renderAllObjects() {
    this.renderAllTables();
    this.renderAllElements();
    this.renderDynamicDimensionLines();
    this.updateFloatingActionsPosition();
  },

  /* ----------------------------------------------------
     TABLES RENDERING (WARM TEAK / HONEY OAK MATERIAL)
     ---------------------------------------------------- */
  renderAllTables() {
    const layer = document.getElementById('editor-tables-layer');
    if (!layer) return;
    layer.innerHTML = '';
    this.tables.forEach(t => this.renderTableElement(t, layer));
  },

  renderTableElement(table, layer) {
    const ns = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(ns, 'g');
    const tableId = String(table.id || table._tempId);
    group.setAttribute('class', `table-group table-${table.status || 'available'}`);
    group.setAttribute('data-table-id', tableId);
    group.setAttribute('pointer-events', 'all');
    group.style.cursor = 'grab';

    const cx = this.px(table.x + (table.width / 2));
    const cy = this.px(table.y + (table.height / 2));

    if (table.rotation) {
      group.setAttribute('transform', `rotate(${table.rotation}, ${cx}, ${cy})`);
    }

    const isSelected = this.selectedItem && this.selectedItem.type === 'table' &&
      String(this.selectedItem.obj.id || this.selectedItem.obj._tempId) === tableId;

    const shapeInfo = this.renderStallShape(table, ns, isSelected);
    group.appendChild(shapeInfo.el);

    // Table number label (placed clearly near top of stall)
    const numY = shapeInfo.textY - 5;
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', shapeInfo.textX);
    label.setAttribute('y', numY);
    label.setAttribute('class', 'table-number');
    label.setAttribute('fill', table.status === 'booked' ? '#ffffff' : '#1e293b');
    label.setAttribute('font-size', '11.5');
    label.setAttribute('font-weight', '700');
    label.setAttribute('font-family', 'Inter, sans-serif');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'central');
    label.setAttribute('pointer-events', 'none');
    label.textContent = table.table_number;

    if (table.rotation) {
      label.setAttribute('transform', `rotate(${-table.rotation}, ${shapeInfo.textX}, ${numY})`);
    }
    group.appendChild(label);

    // Stall dimensions & optional price label (or BOOKED if reserved)
    const isBooked = table.status === 'booked';
    const dimY = isBooked ? shapeInfo.textY + 6 : shapeInfo.textY + 8;
    const dimLabel = document.createElementNS(ns, 'text');
    dimLabel.setAttribute('x', shapeInfo.textX);
    dimLabel.setAttribute('y', dimY);
    dimLabel.setAttribute('class', 'table-dimensions');
    dimLabel.setAttribute('font-size', isBooked ? '7.5' : '8.5');
    dimLabel.setAttribute('font-weight', isBooked ? '700' : '600');
    dimLabel.setAttribute('letter-spacing', isBooked ? '0.04em' : 'normal');
    dimLabel.setAttribute('text-anchor', 'middle');
    dimLabel.setAttribute('dominant-baseline', 'central');
    dimLabel.setAttribute('fill', isBooked ? '#ffe4e6' : '#475569');
    dimLabel.setAttribute('font-family', 'Inter, sans-serif');
    dimLabel.setAttribute('pointer-events', 'none');

    if (isBooked) {
      dimLabel.textContent = 'BOOKED';
    } else {
      const priceVal = parseFloat(table.price) || 0;
      const priceStr = priceVal > 0 ? ` · ₹${priceVal.toLocaleString('en-IN')}` : '';
      dimLabel.textContent = `${Units.formatFeetShort(table.width)} × ${Units.formatFeetShort(table.height)}${priceStr}`;
    }

    if (table.rotation) {
      dimLabel.setAttribute('transform', `rotate(${-table.rotation}, ${shapeInfo.textX}, ${dimY})`);
    }
    group.appendChild(dimLabel);

    layer.appendChild(group);
  },

  renderStallShape(table, ns, isSelected = false) {
    const shape = table.shape || 'rect';
    const isBooked = table.status === 'booked';
    const x = this.px(table.x);
    const y = this.px(table.y);
    const w = this.px(table.width || Units.DEFAULT_STALL_WIDTH_FT);
    const h = this.px(table.height || Units.DEFAULT_STALL_HEIGHT_FT);

    const container = document.createElementNS(ns, 'g');
    container.setAttribute('class', 'table-shape-container');

    if (shape === 'Pod' || (table.width >= 7.5 && table.height >= 3.5)) {
      const halfW = w / 2;
      const halfH = h / 2;
      const t1 = this.createTableUnitRect(x, y, halfW, halfH, ns, isSelected, isBooked);
      const t2 = this.createTableUnitRect(x + halfW, y, halfW, halfH, ns, isSelected, isBooked);
      const t3 = this.createTableUnitRect(x, y + halfH, halfW, halfH, ns, isSelected, isBooked);
      const t4 = this.createTableUnitRect(x + halfW, y + halfH, halfW, halfH, ns, isSelected, isBooked);

      container.appendChild(t1); container.appendChild(t2);
      container.appendChild(t3); container.appendChild(t4);
      return { el: container, textX: x + w / 2, textY: y + h / 2 };
    }

    if (shape === 'T-Stall') {
      const halfW = w / 3;
      const topT = this.createTableUnitRect(x, y, w, h / 2, ns, isSelected, isBooked);
      const stemT = this.createTableUnitRect(x + halfW, y + h / 2, halfW, h / 2, ns, isSelected, isBooked);
      container.appendChild(topT);
      container.appendChild(stemT);
      return { el: container, textX: x + w / 2, textY: y + h / 2 };
    }

    if (shape === 'L-Stall-Inverted' || shape === 'L-Inverted' || shape === 'L-Mirrored') {
      const armW = this.px(2);
      const armH = this.px(2);
      const topT = this.createTableUnitRect(x, y, w, armH, ns, isSelected, isBooked);
      const sideT = this.createTableUnitRect(x + w - armW, y + armH, armW, h - armH, ns, isSelected, isBooked);
      container.appendChild(topT);
      container.appendChild(sideT);
      return { el: container, textX: x + w / 2, textY: y + h / 2 };
    }

    if (shape === 'L-Stall' || shape.startsWith('L')) {
      const armW = this.px(2);
      const armH = this.px(2);
      const topT = this.createTableUnitRect(x, y, w, armH, ns, isSelected, isBooked);
      const sideT = this.createTableUnitRect(x, y + armH, armW, h - armH, ns, isSelected, isBooked);
      container.appendChild(topT);
      container.appendChild(sideT);
      return { el: container, textX: x + w / 2, textY: y + h / 2 };
    }

    if (table.width >= 7.5 && table.height <= 3) {
      const halfW = w / 2;
      const t1 = this.createTableUnitRect(x, y, halfW, h, ns, isSelected, isBooked);
      const t2 = this.createTableUnitRect(x + halfW, y, halfW, h, ns, isSelected, isBooked);
      container.appendChild(t1);
      container.appendChild(t2);
      return { el: container, textX: x + w / 2, textY: y + h / 2 };
    }

    const tRect = this.createTableUnitRect(x, y, w, h, ns, isSelected, isBooked);
    container.appendChild(tRect);
    return { el: container, textX: x + w / 2, textY: y + h / 2 };
  },

  createTableUnitRect(x, y, w, h, ns, isSelected, isBooked = false) {
    const g = document.createElementNS(ns, 'g');

    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', x); rect.setAttribute('y', y);
    rect.setAttribute('width', w); rect.setAttribute('height', h);

    if (isBooked) {
      rect.setAttribute('fill', 'url(#honey-oak-table-booked)');
      rect.setAttribute('stroke', isSelected ? '#2563eb' : '#9f1239');
      rect.setAttribute('stroke-width', isSelected ? '2' : '1.5');
    } else {
      rect.setAttribute('fill', 'url(#honey-oak-table)');
      rect.setAttribute('stroke', isSelected ? '#2563eb' : '#8c5822');
      rect.setAttribute('stroke-width', isSelected ? '2' : '1');
    }

    rect.setAttribute('rx', '2'); rect.setAttribute('ry', '2');
    g.appendChild(rect);

    if (isSelected) {
      const selectTint = document.createElementNS(ns, 'rect');
      selectTint.setAttribute('x', x); selectTint.setAttribute('y', y);
      selectTint.setAttribute('width', w); selectTint.setAttribute('height', h);
      selectTint.setAttribute('fill', 'rgba(37, 99, 235, 0.18)');
      selectTint.setAttribute('pointer-events', 'none');
      selectTint.setAttribute('rx', '2');
      g.appendChild(selectTint);
    }

    return g;
  },

  /* ----------------------------------------------------
     DYNAMIC REAL-TIME CAD DISTANCE MEASUREMENT LINES
     ---------------------------------------------------- */
  renderDynamicDimensionLines() {
    const layer = document.getElementById('editor-dimensions-layer');
    if (!layer) return;
    layer.innerHTML = '';

    if (!this.selectedItem || this.selectedItem.type !== 'table') return;

    const ns = 'http://www.w3.org/2000/svg';
    const target = this.selectedItem.obj;
    const hallW = this.hallWidthFt();
    const hallH = this.hallHeightFt();

    const tX = target.x;
    const tY = target.y;
    const tW = target.width;
    const tH = target.height;
    const cx = this.px(tX + tW / 2);

    // 1. Distance to Left Wall
    if (tX > 0.3) {
      const distFt = tX;
      const x1 = 0;
      const x2 = this.px(tX);
      const lineY = this.px(tY + 1);

      this.drawCadDimensionLeader(layer, ns, x1, lineY, x2, lineY, Units.formatFeetInches(distFt), 'horizontal');
    }

    // 2. Distance to Right Obstacle / Wall
    let minRightDistFt = hallW - (tX + tW);
    let rightTargetX = this.px(hallW);

    this.tables.forEach(other => {
      if (String(other.id || other._tempId) === String(target.id || target._tempId)) return;
      if (other.x >= tX + tW && Math.abs(other.y - tY) < Math.max(tH, other.height)) {
        const gap = other.x - (tX + tW);
        if (gap < minRightDistFt) {
          minRightDistFt = gap;
          rightTargetX = this.px(other.x);
        }
      }
    });

    if (minRightDistFt > 0.2) {
      const x1 = this.px(tX + tW);
      const x2 = rightTargetX;
      const lineY = this.px(tY + 1);
      this.drawCadDimensionLeader(layer, ns, x1, lineY, x2, lineY, Units.formatFeetInches(minRightDistFt), 'horizontal');
    }

    // 3. Distance to Bottom Row / Wall
    let minBottomDistFt = hallH - (tY + tH);
    let bottomTargetY = this.px(hallH);

    this.tables.forEach(other => {
      if (String(other.id || other._tempId) === String(target.id || target._tempId)) return;
      if (other.y >= tY + tH && Math.abs(other.x - tX) < Math.max(tW, other.width)) {
        const gap = other.y - (tY + tH);
        if (gap < minBottomDistFt) {
          minBottomDistFt = gap;
          bottomTargetY = this.px(other.y);
        }
      }
    });

    if (minBottomDistFt > 0.2) {
      const y1 = this.px(tY + tH);
      const y2 = bottomTargetY;
      const lineX = cx;
      this.drawCadDimensionLeader(layer, ns, lineX, y1, lineX, y2, Units.formatFeetInches(minBottomDistFt), 'vertical');
    }
  },

  drawCadDimensionLeader(layer, ns, x1, y1, x2, y2, text, orientation) {
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'cad-dimension-group');
    g.setAttribute('pointer-events', 'none');

    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('class', 'cad-dimension-line');
    g.appendChild(line);

    const tickLen = 4;
    if (orientation === 'horizontal') {
      const tick1 = document.createElementNS(ns, 'line');
      tick1.setAttribute('x1', x1); tick1.setAttribute('y1', y1 - tickLen);
      tick1.setAttribute('x2', x1); tick1.setAttribute('y2', y1 + tickLen);
      tick1.setAttribute('class', 'cad-dimension-line');
      g.appendChild(tick1);

      const tick2 = document.createElementNS(ns, 'line');
      tick2.setAttribute('x1', x2); tick2.setAttribute('y1', y2 - tickLen);
      tick2.setAttribute('x2', x2); tick2.setAttribute('y2', y2 + tickLen);
      tick2.setAttribute('class', 'cad-dimension-line');
      g.appendChild(tick2);
    } else {
      const tick1 = document.createElementNS(ns, 'line');
      tick1.setAttribute('x1', x1 - tickLen); tick1.setAttribute('y1', y1);
      tick1.setAttribute('x2', x1 + tickLen); tick1.setAttribute('y2', y1);
      tick1.setAttribute('class', 'cad-dimension-line');
      g.appendChild(tick1);

      const tick2 = document.createElementNS(ns, 'line');
      tick2.setAttribute('x1', x2 - tickLen); tick2.setAttribute('y1', y2);
      tick2.setAttribute('x2', x2 + tickLen); tick2.setAttribute('y2', y2);
      tick2.setAttribute('class', 'cad-dimension-line');
      g.appendChild(tick2);
    }

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const badgeW = text.length * 6.5 + 10;
    const badgeH = 16;

    const bgRect = document.createElementNS(ns, 'rect');
    bgRect.setAttribute('x', midX - badgeW / 2);
    bgRect.setAttribute('y', midY - badgeH / 2);
    bgRect.setAttribute('width', badgeW);
    bgRect.setAttribute('height', badgeH);
    bgRect.setAttribute('class', 'cad-dimension-badge-bg');
    g.appendChild(bgRect);

    const txt = document.createElementNS(ns, 'text');
    txt.setAttribute('x', midX);
    txt.setAttribute('y', midY);
    txt.setAttribute('class', 'cad-dimension-badge-text');
    txt.textContent = text;
    g.appendChild(txt);

    layer.appendChild(g);
  },

  /* ----------------------------------------------------
     ARCHITECTURAL ELEMENTS (WALL-INSET & OUTSIDE ITEMS)
     ---------------------------------------------------- */
  renderAllElements() {
    const doorsLayer = document.getElementById('editor-doors-layer');
    const textLayer = document.getElementById('editor-text-layer');
    const structLayer = document.getElementById('editor-structures-layer');

    if (doorsLayer) doorsLayer.innerHTML = '';
    if (textLayer) textLayer.innerHTML = '';
    if (structLayer) structLayer.innerHTML = '';

    this.elements.forEach(elem => {
      if (elem.type === 'door') {
        if (doorsLayer) this.renderDoorElement(elem, doorsLayer);
      } else if (elem.type === 'text') {
        if (textLayer) this.renderTextElement(elem, textLayer);
      } else if (elem.type === 'room_badge') {
        if (textLayer) this.renderRoomBadgeElement(elem, textLayer);
      } else if (elem.type === 'hall_room') {
        if (structLayer) this.renderHallRoomElement(elem, structLayer);
      } else {
        if (structLayer) this.renderStructureElement(elem, structLayer);
      }
    });
  },

  renderHallRoomElement(room, layer) {
    const ns = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(ns, 'g');
    const elemId = String(room.id || room._tempId);
    group.setAttribute('class', 'arch-element arch-hall-room');
    group.setAttribute('data-element-id', elemId);
    group.setAttribute('pointer-events', 'all');
    group.style.cursor = 'grab';

    const w = this.px(room.width || 30);
    const h = this.px(room.height || 20);
    const cx = this.px(room.x + (room.width || 30) / 2);
    const cy = this.px(room.y + (room.height || 20) / 2);
    const x = this.px(room.x);
    const y = this.px(room.y);

    if (room.rotation) {
      group.setAttribute('transform', `rotate(${room.rotation}, ${cx}, ${cy})`);
    }

    const wallThick = this.px(WALL_THICKNESS_FT);

    // Floor Base with parquet / oak floor pattern
    const floor = document.createElementNS(ns, 'rect');
    floor.setAttribute('x', x); floor.setAttribute('y', y);
    floor.setAttribute('width', w); floor.setAttribute('height', h);
    floor.setAttribute('fill', 'url(#honey-oak-pattern)');
    floor.setAttribute('opacity', '0.9');
    group.appendChild(floor);

    // Subtle floor plank overlay
    const gridOverlay = document.createElementNS(ns, 'rect');
    gridOverlay.setAttribute('x', x); gridOverlay.setAttribute('y', y);
    gridOverlay.setAttribute('width', w); gridOverlay.setAttribute('height', h);
    gridOverlay.setAttribute('fill', 'rgba(255, 255, 255, 0.08)');
    gridOverlay.setAttribute('pointer-events', 'none');
    group.appendChild(gridOverlay);

    // Outer Architectural Perimeter Wall
    const wall = document.createElementNS(ns, 'rect');
    wall.setAttribute('x', x); wall.setAttribute('y', y);
    wall.setAttribute('width', w); wall.setAttribute('height', h);
    wall.setAttribute('fill', 'none');
    wall.setAttribute('stroke', '#1e293b');
    wall.setAttribute('stroke-width', wallThick);
    wall.setAttribute('stroke-linejoin', 'miter');
    group.appendChild(wall);

    // Room Title Header inside the room
    const titleG = document.createElementNS(ns, 'g');
    titleG.setAttribute('transform', `translate(${x + 14}, ${y + 14})`);

    const titleText = room.name || room.label || 'Secondary Hall';
    const areaSqFt = Math.round((room.width || 30) * (room.height || 20));

    const badgeBg = document.createElementNS(ns, 'rect');
    const badgeW = Math.max(titleText.length * 8 + 24, 110);
    badgeBg.setAttribute('x', '0'); badgeBg.setAttribute('y', '0');
    badgeBg.setAttribute('width', badgeW); badgeBg.setAttribute('height', '36');
    badgeBg.setAttribute('rx', '6');
    badgeBg.setAttribute('fill', 'rgba(255, 255, 255, 0.95)');
    badgeBg.setAttribute('stroke', '#cbd5e1');
    badgeBg.setAttribute('stroke-width', '1');
    badgeBg.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))');
    titleG.appendChild(badgeBg);

    const titleEl = document.createElementNS(ns, 'text');
    titleEl.setAttribute('x', '12'); titleEl.setAttribute('y', '15');
    titleEl.setAttribute('fill', '#0f172a');
    titleEl.setAttribute('font-size', '11.5');
    titleEl.setAttribute('font-weight', '700');
    titleEl.setAttribute('font-family', 'Inter, -apple-system, sans-serif');
    titleEl.textContent = titleText;
    titleG.appendChild(titleEl);

    const subEl = document.createElementNS(ns, 'text');
    subEl.setAttribute('x', '12'); subEl.setAttribute('y', '27');
    subEl.setAttribute('fill', '#64748b');
    subEl.setAttribute('font-size', '9');
    subEl.setAttribute('font-weight', '600');
    subEl.setAttribute('font-family', 'Inter, -apple-system, sans-serif');
    subEl.textContent = `${Units.formatFeetShort(room.width || 30)} × ${Units.formatFeetShort(room.height || 20)} · ${areaSqFt.toLocaleString('en-IN')} sq ft`;
    titleG.appendChild(subEl);

    group.appendChild(titleG);

    // Dimension lines along secondary hall boundary
    this.renderDimensionLine(group, x, y - 16, x + w, y - 16, Units.formatDims(room.width || 30), 'top');
    this.renderDimensionLine(group, x - 16, y, x - 16, y + h, Units.formatDims(room.height || 20), 'left');

    const isSelected = this.selectedItem && this.selectedItem.type === 'element' &&
      String(this.selectedItem.obj.id || this.selectedItem.obj._tempId) === elemId;

    if (isSelected) {
      const selectOutline = document.createElementNS(ns, 'rect');
      selectOutline.setAttribute('x', x - 6); selectOutline.setAttribute('y', y - 6);
      selectOutline.setAttribute('width', w + 12); selectOutline.setAttribute('height', h + 12);
      selectOutline.setAttribute('fill', 'none');
      selectOutline.setAttribute('stroke', '#2563eb');
      selectOutline.setAttribute('stroke-width', '2');
      selectOutline.setAttribute('stroke-dasharray', '5 4');
      selectOutline.setAttribute('rx', '6');
      selectOutline.setAttribute('pointer-events', 'none');
      group.appendChild(selectOutline);
    }

    layer.appendChild(group);
  },

  renderRoomBadgeElement(badge, layer) {
    const ns = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(ns, 'g');
    const elemId = String(badge.id || 'room_badge_main');
    group.setAttribute('class', 'arch-element arch-room-badge');
    group.setAttribute('data-element-id', elemId);
    group.setAttribute('pointer-events', 'all');
    group.style.cursor = 'grab';

    const cx = this.px(badge.x + (badge.width || 8) / 2);
    const cy = this.px(badge.y + (badge.height || 3) / 2);

    if (badge.rotation) {
      group.setAttribute('transform', `rotate(${badge.rotation}, ${cx}, ${cy})`);
    }

    const x = this.px(badge.x);
    const y = this.px(badge.y);
    const w = this.px(badge.width || 8);
    const h = this.px(badge.height || 3);

    // Hit box
    const hitBox = document.createElementNS(ns, 'rect');
    hitBox.setAttribute('x', x - 4); hitBox.setAttribute('y', y - 4);
    hitBox.setAttribute('width', w + 8); hitBox.setAttribute('height', h + 8);
    hitBox.setAttribute('fill', 'transparent');
    hitBox.setAttribute('pointer-events', 'all');
    group.appendChild(hitBox);

    const titleText = badge.label || this.eventData.name || 'Unnamed';
    const areaFt = Math.round(this.hallWidthFt() * this.hallHeightFt());

    const titleEl = document.createElementNS(ns, 'text');
    titleEl.setAttribute('x', x);
    titleEl.setAttribute('y', y + 10);
    titleEl.setAttribute('fill', '#1e293b');
    titleEl.setAttribute('font-size', '11');
    titleEl.setAttribute('font-weight', '700');
    titleEl.setAttribute('font-family', 'Inter, -apple-system, sans-serif');
    titleEl.setAttribute('pointer-events', 'none');
    titleEl.textContent = titleText;
    group.appendChild(titleEl);

    const areaEl = document.createElementNS(ns, 'text');
    areaEl.setAttribute('x', x);
    areaEl.setAttribute('y', y + 24);
    areaEl.setAttribute('fill', '#64748b');
    areaEl.setAttribute('font-size', '9.5');
    areaEl.setAttribute('font-weight', '600');
    areaEl.setAttribute('font-family', 'Inter, -apple-system, sans-serif');
    areaEl.setAttribute('pointer-events', 'none');
    areaEl.textContent = `${areaFt.toLocaleString('en-IN')} sq ft`;
    group.appendChild(areaEl);

    const isSelected = this.selectedItem && this.selectedItem.type === 'element' &&
      String(this.selectedItem.obj.id || this.selectedItem.obj._tempId) === elemId;

    if (isSelected) {
      const selectBox = document.createElementNS(ns, 'rect');
      selectBox.setAttribute('x', x - 6); selectBox.setAttribute('y', y - 4);
      selectBox.setAttribute('width', w + 12); selectBox.setAttribute('height', h + 12);
      selectBox.setAttribute('fill', 'none');
      selectBox.setAttribute('stroke', '#2563eb');
      selectBox.setAttribute('stroke-width', '1.5');
      selectBox.setAttribute('stroke-dasharray', '3 3');
      selectBox.setAttribute('rx', '4');
      selectBox.setAttribute('pointer-events', 'none');
      group.appendChild(selectBox);
    }

    layer.appendChild(group);
  },

  renderDoorElement(door, layer) {
    const ns = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(ns, 'g');
    const elemId = String(door.id || door._tempId);
    group.setAttribute('class', `arch-element arch-door arch-door-${door.doorType || 'entrance'}`);
    group.setAttribute('data-element-id', elemId);
    group.setAttribute('pointer-events', 'all');
    group.style.cursor = 'grab';

    const w = this.px(door.width || 4);
    const h = this.px(door.height || 2);
    const cx = this.px(door.x + (door.width || 4) / 2);
    const cy = this.px(door.y + (door.height || 2) / 2);

    if (door.rotation) {
      group.setAttribute('transform', `rotate(${door.rotation}, ${cx}, ${cy})`);
    }

    const x = this.px(door.x);
    const y = this.px(door.y);

    // Hit box
    const hitBox = document.createElementNS(ns, 'rect');
    hitBox.setAttribute('x', x - 4); hitBox.setAttribute('y', y - 4);
    hitBox.setAttribute('width', w + 8); hitBox.setAttribute('height', Math.max(h, w) + 8);
    hitBox.setAttribute('fill', 'transparent');
    hitBox.setAttribute('pointer-events', 'all');
    group.appendChild(hitBox);

    if (door.doorType === 'window') {
      const frame = document.createElementNS(ns, 'rect');
      frame.setAttribute('x', x); frame.setAttribute('y', y);
      frame.setAttribute('width', w); frame.setAttribute('height', this.px(WALL_THICKNESS_FT));
      frame.setAttribute('fill', '#ffffff');
      frame.setAttribute('stroke', '#1e293b');
      frame.setAttribute('stroke-width', '1.5');
      group.appendChild(frame);

      const gLine1 = document.createElementNS(ns, 'line');
      gLine1.setAttribute('x1', x); gLine1.setAttribute('y1', y + this.px(WALL_THICKNESS_FT)/3);
      gLine1.setAttribute('x2', x + w); gLine1.setAttribute('y2', y + this.px(WALL_THICKNESS_FT)/3);
      gLine1.setAttribute('stroke', '#38bdf8'); gLine1.setAttribute('stroke-width', '1.2');
      group.appendChild(gLine1);

      const gLine2 = document.createElementNS(ns, 'line');
      gLine2.setAttribute('x1', x); gLine2.setAttribute('y1', y + (this.px(WALL_THICKNESS_FT)*2)/3);
      gLine2.setAttribute('x2', x + w); gLine2.setAttribute('y2', y + (this.px(WALL_THICKNESS_FT)*2)/3);
      gLine2.setAttribute('stroke', '#38bdf8'); gLine2.setAttribute('stroke-width', '1.2');
      group.appendChild(gLine2);
    } else {
      const swingR = w;
      const isExit = door.doorType === 'exit';
      const wallThick = this.px(WALL_THICKNESS_FT);
      const isFlipped = !!door.flip;

      // Clean wall opening cutout
      const cutout = document.createElementNS(ns, 'rect');
      cutout.setAttribute('x', x); cutout.setAttribute('y', y - wallThick / 2);
      cutout.setAttribute('width', w); cutout.setAttribute('height', wallThick);
      cutout.setAttribute('fill', '#ffffff');
      group.appendChild(cutout);

      // Threshold lines
      const threshTop = document.createElementNS(ns, 'line');
      threshTop.setAttribute('x1', x); threshTop.setAttribute('y1', y - wallThick / 2);
      threshTop.setAttribute('x2', x + w); threshTop.setAttribute('y2', y - wallThick / 2);
      threshTop.setAttribute('stroke', '#cbd5e1'); threshTop.setAttribute('stroke-width', '1');
      group.appendChild(threshTop);

      const threshBot = document.createElementNS(ns, 'line');
      threshBot.setAttribute('x1', x); threshBot.setAttribute('y1', y + wallThick / 2);
      threshBot.setAttribute('x2', x + w); threshBot.setAttribute('y2', y + wallThick / 2);
      threshBot.setAttribute('stroke', '#94a3b8'); threshBot.setAttribute('stroke-width', '1');
      group.appendChild(threshBot);

      // 90° Swing Arc
      const arc = document.createElementNS(ns, 'path');
      if (isFlipped) {
        // Hinged on Left, swings down from right
        arc.setAttribute('d', `M ${x + swingR} ${y + wallThick / 2} A ${swingR} ${swingR} 0 0 1 ${x} ${y + wallThick / 2 + swingR}`);
      } else {
        // Hinged on Right, swings down from left
        arc.setAttribute('d', `M ${x} ${y + wallThick / 2} A ${swingR} ${swingR} 0 0 0 ${x + swingR} ${y + wallThick / 2 + swingR}`);
      }
      arc.setAttribute('fill', 'none');
      arc.setAttribute('stroke', isExit ? '#f87171' : '#94a3b8');
      arc.setAttribute('stroke-width', '1');
      arc.setAttribute('stroke-dasharray', 'none');
      group.appendChild(arc);

      // Door Leaf (Panel)
      const leaf = document.createElementNS(ns, 'rect');
      const leafX = isFlipped ? x : x + swingR - 3.5;
      const leafY = y + wallThick / 2;
      leaf.setAttribute('x', leafX);
      leaf.setAttribute('y', leafY);
      leaf.setAttribute('width', 3.5);
      leaf.setAttribute('height', swingR);
      leaf.setAttribute('fill', '#ffffff');
      leaf.setAttribute('stroke', isExit ? '#dc2626' : '#1e293b');
      leaf.setAttribute('stroke-width', '1.2');
      leaf.setAttribute('rx', '1');
      group.appendChild(leaf);

      // Wall Jambs
      const jambL = document.createElementNS(ns, 'rect');
      jambL.setAttribute('x', x - 2); jambL.setAttribute('y', y - wallThick / 2);
      jambL.setAttribute('width', 2.5); jambL.setAttribute('height', wallThick);
      jambL.setAttribute('fill', '#1e293b');
      group.appendChild(jambL);

      const jambR = document.createElementNS(ns, 'rect');
      jambR.setAttribute('x', x + w - 0.5); jambR.setAttribute('y', y - wallThick / 2);
      jambR.setAttribute('width', 2.5); jambR.setAttribute('height', wallThick);
      jambR.setAttribute('fill', '#1e293b');
      group.appendChild(jambR);
    }

    const isSelected = this.selectedItem && this.selectedItem.type === 'element' &&
      String(this.selectedItem.obj.id || this.selectedItem.obj._tempId) === elemId;

    if (isSelected) {
      const selectOutline = document.createElementNS(ns, 'rect');
      selectOutline.setAttribute('x', x - 4); selectOutline.setAttribute('y', y - 4);
      selectOutline.setAttribute('width', w + 8); selectOutline.setAttribute('height', Math.max(h, w) + 8);
      selectOutline.setAttribute('fill', 'none');
      selectOutline.setAttribute('stroke', '#2563eb');
      selectOutline.setAttribute('stroke-width', '1.5');
      selectOutline.setAttribute('stroke-dasharray', '3 3');
      selectOutline.setAttribute('rx', '4');
      selectOutline.setAttribute('pointer-events', 'none');
      group.appendChild(selectOutline);
    }

    layer.appendChild(group);
  },

  renderTextElement(elem, layer) {
    const ns = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(ns, 'g');
    const elemId = String(elem.id || elem._tempId);
    group.setAttribute('class', 'arch-element arch-text-element');
    group.setAttribute('data-element-id', elemId);
    group.setAttribute('pointer-events', 'all');
    group.style.cursor = 'grab';

    const cx = this.px(elem.x + (elem.width || 4) / 2);
    const cy = this.px(elem.y + (elem.height || 2) / 2);

    if (elem.rotation) {
      group.setAttribute('transform', `rotate(${elem.rotation}, ${cx}, ${cy})`);
    }

    const textStr = elem.text || elem.label || 'LABEL';
    const fontSize = elem.fontSize || 14;
    const color = elem.color || '#0f172a';
    const isBold = elem.fontWeight === 'bold' || elem.fontWeight === '700' || elem.fontWeight === '800';

    const paddingX = 12;
    const textLength = Math.max(textStr.length * (fontSize * 0.6) + paddingX * 2, 50);
    const badgeH = fontSize + 12;

    const badge = document.createElementNS(ns, 'rect');
    badge.setAttribute('x', cx - textLength / 2);
    badge.setAttribute('y', cy - badgeH / 2);
    badge.setAttribute('width', textLength);
    badge.setAttribute('height', badgeH);
    badge.setAttribute('rx', elem.badge ? badgeH / 2 : 4);
    badge.setAttribute('fill', elem.badge ? '#ffffff' : 'transparent');
    badge.setAttribute('stroke', elem.badge ? color : 'transparent');
    badge.setAttribute('stroke-width', '1.5');
    if (elem.badge) badge.setAttribute('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.06))');
    group.appendChild(badge);

    const textEl = document.createElementNS(ns, 'text');
    textEl.setAttribute('x', cx);
    textEl.setAttribute('y', cy + (fontSize * 0.35));
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('fill', color);
    textEl.setAttribute('font-size', `${fontSize}`);
    textEl.setAttribute('font-weight', isBold ? '700' : '600');
    textEl.setAttribute('font-family', 'Inter, -apple-system, sans-serif');
    textEl.setAttribute('letter-spacing', '0.03em');
    textEl.setAttribute('pointer-events', 'none');
    textEl.textContent = textStr;
    group.appendChild(textEl);

    const isSelected = this.selectedItem && this.selectedItem.type === 'element' &&
      String(this.selectedItem.obj.id || this.selectedItem.obj._tempId) === elemId;

    if (isSelected) {
      const box = document.createElementNS(ns, 'rect');
      box.setAttribute('x', cx - textLength / 2 - 4); box.setAttribute('y', cy - badgeH / 2 - 4);
      box.setAttribute('width', textLength + 8); box.setAttribute('height', badgeH + 8);
      box.setAttribute('fill', 'none');
      box.setAttribute('stroke', '#2563eb');
      box.setAttribute('stroke-width', '1.5');
      box.setAttribute('stroke-dasharray', '3 3');
      box.setAttribute('rx', '6');
      box.setAttribute('pointer-events', 'none');
      group.appendChild(box);
    }

    layer.appendChild(group);
  },

  renderStructureElement(elem, layer) {
    const ns = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(ns, 'g');
    const elemId = String(elem.id || elem._tempId);
    group.setAttribute('class', `arch-element arch-structure arch-${elem.type}`);
    group.setAttribute('data-element-id', elemId);
    group.setAttribute('pointer-events', 'all');
    group.style.cursor = 'grab';

    const w = this.px(elem.width || 2);
    const h = this.px(elem.height || 2);
    const x = this.px(elem.x);
    const y = this.px(elem.y);
    const cx = x + w / 2;
    const cy = y + h / 2;

    if (elem.rotation) {
      group.setAttribute('transform', `rotate(${elem.rotation}, ${cx}, ${cy})`);
    }

    const hitBox = document.createElementNS(ns, 'rect');
    hitBox.setAttribute('x', x - 2); hitBox.setAttribute('y', y - 2);
    hitBox.setAttribute('width', w + 4); hitBox.setAttribute('height', h + 4);
    hitBox.setAttribute('fill', 'transparent');
    hitBox.setAttribute('pointer-events', 'all');
    group.appendChild(hitBox);

    if (elem.type === 'pillar_round') {
      const r = Math.min(w, h) / 2;
      const col = document.createElementNS(ns, 'circle');
      col.setAttribute('cx', cx); col.setAttribute('cy', cy); col.setAttribute('r', r);
      col.setAttribute('fill', '#94a3b8'); col.setAttribute('stroke', '#334155'); col.setAttribute('stroke-width', '1.5');
      group.appendChild(col);
    } else if (elem.type === 'stage') {
      const stage = document.createElementNS(ns, 'rect');
      stage.setAttribute('x', x); stage.setAttribute('y', y);
      stage.setAttribute('width', w); stage.setAttribute('height', h);
      stage.setAttribute('fill', '#334155'); stage.setAttribute('stroke', '#0f172a'); stage.setAttribute('stroke-width', '2');
      stage.setAttribute('rx', '4');
      group.appendChild(stage);

      const stageLabel = document.createElementNS(ns, 'text');
      stageLabel.setAttribute('x', cx); stageLabel.setAttribute('y', cy + 5);
      stageLabel.setAttribute('text-anchor', 'middle'); stageLabel.setAttribute('fill', '#f8fafc');
      stageLabel.setAttribute('font-size', '13'); stageLabel.setAttribute('font-weight', '700');
      stageLabel.setAttribute('pointer-events', 'none');
      stageLabel.textContent = (elem.label || 'STAGE').toUpperCase();
      group.appendChild(stageLabel);
    } else {
      const pillar = document.createElementNS(ns, 'rect');
      pillar.setAttribute('x', x); pillar.setAttribute('y', y);
      pillar.setAttribute('width', w); pillar.setAttribute('height', h);
      pillar.setAttribute('fill', '#94a3b8'); pillar.setAttribute('stroke', '#334155'); pillar.setAttribute('stroke-width', '1.5');
      pillar.setAttribute('rx', '2');
      group.appendChild(pillar);
    }

    const isSelected = this.selectedItem && this.selectedItem.type === 'element' &&
      String(this.selectedItem.obj.id || this.selectedItem.obj._tempId) === elemId;

    if (isSelected) {
      const ring = document.createElementNS(ns, 'rect');
      ring.setAttribute('x', x - 4); ring.setAttribute('y', y - 4);
      ring.setAttribute('width', w + 8); ring.setAttribute('height', h + 8);
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', '#2563eb');
      ring.setAttribute('stroke-width', '1.5');
      ring.setAttribute('stroke-dasharray', '3 3');
      ring.setAttribute('rx', '6');
      ring.setAttribute('pointer-events', 'none');
      group.appendChild(ring);
    }

    layer.appendChild(group);
  },

  /* ----------------------------------------------------
     TOOLBAR & PALETTE ACTIONS
     ---------------------------------------------------- */
  switchToolbarTab(tabName) {
    const tabs = ['stalls', 'doors', 'text', 'structures'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const group = document.getElementById(`subtools-${t}`);
      if (btn) btn.classList.toggle('active', t === tabName);
      if (group) group.classList.toggle('hidden', t !== tabName);
    });
  },

  addTable(stallType = 'single') {
    const defaults = STALL_DEFAULTS[stallType] || STALL_DEFAULTS.single;
    const hallW = this.hallWidthFt();
    const hallH = this.hallHeightFt();

    const newTable = {
      _tempId: 'table_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      event_id: parseInt(this.eventId),
      table_number: this.getNextAvailableTableNum(),
      label: defaults.label,
      size: defaults.size,
      price: 0,
      x: Math.round(hallW / 2 - defaults.width / 2),
      y: Math.round(hallH / 2 - defaults.height / 2),
      width: defaults.width,
      height: defaults.height,
      rotation: 0,
      shape: defaults.shape,
      status: 'available'
    };

    this.clampToBounds(newTable, 'table');
    this.tables.push(newTable);
    this.renderAllObjects();
    this.selectObject('table', newTable);
    this.updateDirectoryList();

    showToast(`Stall ${newTable.table_number} added — ${defaults.label} (${Units.formatDims(defaults.width, defaults.height)})`, 'success');
  },

  addDoor(doorType = 'entrance') {
    const hallW = this.hallWidthFt();
    const width = doorType === 'window' ? 6 : (doorType === 'double' ? 6 : 4);
    const height = 2;

    const newDoor = {
      id: 'door_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: 'door',
      doorType: doorType,
      label: doorType === 'exit' ? 'EMERGENCY EXIT' : (doorType === 'window' ? 'WINDOW' : 'MAIN ENTRANCE'),
      x: Math.round(hallW / 2 - width / 2),
      y: 0,
      width: width,
      height: height,
      rotation: 0
    };

    this.clampToBounds(newDoor, 'element');
    this.elements.push(newDoor);
    this.renderAllObjects();
    this.selectObject('element', newDoor);
    this.updateDirectoryList();

    showToast(`Added ${newDoor.label} (${width} ft)`, 'success');
  },

  addTextElement(text = 'MAIN ENTRANCE', options = {}) {
    const hallW = this.hallWidthFt();

    const newText = {
      id: 'text_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: 'text',
      text: text,
      fontSize: options.fontSize || 14,
      fontWeight: options.fontWeight || '700',
      color: options.color || '#0f172a',
      badge: options.badge !== undefined ? options.badge : true,
      x: Math.round(hallW / 2 - 4),
      y: -5,
      width: 8,
      height: 3,
      rotation: 0
    };

    this.clampToBounds(newText, 'element');
    this.elements.push(newText);
    this.renderAllObjects();
    this.selectObject('element', newText);
    this.updateDirectoryList();

    showToast(`Added Sign: "${text}"`, 'success');
  },

  addCustomTextPrompt() {
    const text = prompt('Enter text for label (e.g. VIP LOUNGE, NORTH ENTRANCE):', 'MAIN ENTRANCE');
    if (text && text.trim()) {
      this.addTextElement(text.trim(), { badge: true, color: '#2563eb' });
    }
  },

  switchToolbarTab(tab) {
    const tabs = ['stalls', 'halls', 'doors', 'text', 'structures'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const subgroup = document.getElementById(`subtools-${t}`);
      if (btn) btn.classList.toggle('active', t === tab);
      if (subgroup) subgroup.classList.toggle('hidden', t !== tab);
    });
  },

  addHallRoom(preset = {}) {
    const w = preset.width || 30;
    const h = preset.height || 20;
    const hallW = this.hallWidthFt();

    const existingHalls = this.elements.filter(el => el.type === 'hall_room');
    const nextLetter = String.fromCharCode(66 + existingHalls.length); // 'B', 'C', 'D'
    const defaultName = preset.name || `Hall ${nextLetter}`;

    let targetX = hallW + 6;
    if (existingHalls.length > 0) {
      const lastHall = existingHalls[existingHalls.length - 1];
      targetX = (lastHall.x || 0) + (lastHall.width || 30) + 6;
    }

    const newRoom = {
      id: 'hall_room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: 'hall_room',
      name: defaultName,
      label: defaultName,
      width: w,
      height: h,
      x: Units.roundFt(targetX),
      y: 0,
      rotation: 0
    };

    this.elements.push(newRoom);
    this.setupViewBox();
    this.renderAllObjects();
    this.selectObject('element', newRoom);
    this.updateDirectoryList();
    showToast(`Added ${defaultName} (${w}' × ${h}')`, 'success');
  },

  promptCustomHallRoom() {
    const width = parseFloat(prompt('Enter Hall Width in feet (e.g. 35):', '35')) || 35;
    const height = parseFloat(prompt('Enter Hall Depth in feet (e.g. 25):', '25')) || 25;
    const name = prompt('Enter Hall Name / Title:', 'Hall B') || 'Hall B';
    this.addHallRoom({ width: Math.max(10, width), height: Math.max(10, height), name: name.trim() });
  },

  addStructure(structType = 'pillar_square') {
    const hallW = this.hallWidthFt();
    const hallH = this.hallHeightFt();

    let width = 2;
    let height = 2;
    let label = 'Pillar';

    if (structType === 'stage') {
      width = 16;
      height = 8;
      label = 'Main Stage';
    } else if (structType === 'arrow') {
      width = 6;
      height = 2;
      label = 'Entry Flow';
    }

    const newStruct = {
      id: 'struct_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: structType,
      label: label,
      x: Math.round(hallW / 2 - width / 2),
      y: Math.round(hallH / 2 - height / 2),
      width: width,
      height: height,
      rotation: 0
    };

    this.clampToBounds(newStruct, 'element');
    this.elements.push(newStruct);
    this.renderAllObjects();
    this.selectObject('element', newStruct);
    this.updateDirectoryList();

    showToast(`Added ${label}`, 'success');
  },

  /* ----------------------------------------------------
     UNIFIED SELECTION & INSPECTOR ENGINE
     ---------------------------------------------------- */
  selectObject(type, obj) {
    this.selectedItem = { type, obj };
    this.renderAllObjects();
    this.showProperties(this.selectedItem);
    this.updateDirectoryList();
  },

  deselect() {
    this.selectedItem = null;
    this.renderAllObjects();
    this.showEmptyProperties();
    this.updateDirectoryList();
    this.clearGuides();
  },

  showProperties(item) {
    if (!item) {
      this.showEmptyProperties();
      return;
    }

    const badge = document.getElementById('inspector-badge');
    const headerTitle = document.getElementById('inspector-header-title');
    const body = document.getElementById('properties-body');

    if (badge) badge.style.display = 'inline-block';

    if (item.type === 'table') {
      const table = item.obj;
      if (headerTitle) headerTitle.textContent = `Stall ${table.table_number}`;
      if (badge) { badge.textContent = 'Stall'; badge.className = 'badge badge-available'; }

      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Stall Number</label>
          <input type="text" class="form-input" value="${table.table_number}" oninput="layoutEditor.updateItemProp('table_number', this.value, true)" id="prop-number">
        </div>
        <div class="form-group">
          <label class="form-label">Price / Stall Fee (₹)</label>
          <div class="input-with-unit">
            <input type="number" class="form-input" min="0" step="500" value="${table.price || 0}" oninput="layoutEditor.updateItemProp('price', parseFloat(this.value)||0, true)" id="prop-price" placeholder="e.g. 5000">
            <span class="input-unit">₹</span>
          </div>
          <p class="form-hint" style="margin-top: 2px;">Fee displayed for visitors to acknowledge during booking</p>
        </div>
        <div class="form-group">
          <label class="form-label">Label / Category</label>
          <input type="text" class="form-input" value="${table.label || ''}" oninput="layoutEditor.updateItemProp('label', this.value, true)" id="prop-label">
        </div>
        ${table.shape && table.shape.startsWith('L') ? `
        <div class="form-group">
          <label class="form-label">L-Shape Arm Orientation</label>
          <button type="button" class="btn btn-secondary btn-sm" onclick="layoutEditor.toggleInvertL()" style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 6px 10px;">
            <span>${(table.shape === 'L-Stall-Inverted' || table.shape === 'L-Inverted') ? 'Right-Hand (Inverted ⅃)' : 'Left-Hand (Standard L)'}</span>
            <span style="font-weight: 700; color: var(--accent-primary);">⇄ Invert Shape</span>
          </button>
        </div>
        ` : ''}
        <div class="form-group">
          <label class="form-label">Orientation &amp; Rotation</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xs); margin-bottom: var(--space-xs);">
            <button type="button" class="btn btn-secondary btn-sm" onclick="layoutEditor.flipSelected()" title="Flip Orientation (F)" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 2 3 6 7 10"></polyline><polyline points="17 14 21 18 17 22"></polyline><line x1="3" y1="6" x2="21" y2="6"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>
              <span>Flip (F)</span>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="layoutEditor.rotateSelected()" title="Rotate +90° (R)" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
              <span>Rotate +90°</span>
            </button>
          </div>
          <div style="display: flex; gap: var(--space-xs); align-items: center;">
            <input type="number" class="form-input" value="${table.rotation || 0}" step="90" oninput="layoutEditor.updateItemProp('rotation', (parseFloat(this.value)||0)%360, true)" id="prop-rotation">
            <span class="text-muted" style="font-size: 0.78rem;">deg</span>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xs);">
          <div class="form-group">
            <label class="form-label">Width</label>
            <div class="input-with-unit">
              <input type="number" class="form-input" step="0.25" min="${Units.STALL_MIN_FT}" max="${Units.STALL_MAX_FT}" value="${table.width}" oninput="layoutEditor.updateItemProp('width', Units.clampStallFt(this.value, ${Units.DEFAULT_STALL_WIDTH_FT}), true)" id="prop-width">
              <span class="input-unit">ft</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Depth</label>
            <div class="input-with-unit">
              <input type="number" class="form-input" step="0.25" min="${Units.STALL_MIN_FT}" max="${Units.STALL_MAX_FT}" value="${table.height}" oninput="layoutEditor.updateItemProp('height', Units.clampStallFt(this.value, ${Units.DEFAULT_STALL_HEIGHT_FT}), true)" id="prop-height">
              <span class="input-unit">ft</span>
            </div>
          </div>
        </div>
        <p class="form-hint" style="margin-top: -6px; margin-bottom: var(--space-sm);">
          ${Units.formatDims(table.width, table.height)} &middot; ${Units.formatArea(table.width, table.height)}
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xs);">
          <div class="form-group">
            <label class="form-label">X Position</label>
            <div class="input-with-unit">
              <input type="number" class="form-input" step="0.25" value="${Units.roundFt(table.x)}" oninput="layoutEditor.updateItemProp('x', Units.roundFt(Units.toFeet(this.value, 0)), true)" id="prop-x">
              <span class="input-unit">ft</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Y Position</label>
            <div class="input-with-unit">
              <input type="number" class="form-input" step="0.25" value="${Units.roundFt(table.y)}" oninput="layoutEditor.updateItemProp('y', Units.roundFt(Units.toFeet(this.value, 0)), true)" id="prop-y">
              <span class="input-unit">ft</span>
            </div>
          </div>
        </div>
      `;
    } else if (item.type === 'element') {
      const elem = item.obj;
      const isRoomBadge = elem.type === 'room_badge';
      const isHallRoom = elem.type === 'hall_room';

      if (headerTitle) headerTitle.textContent = isHallRoom ? (elem.name || elem.label || 'Secondary Hall') : (isRoomBadge ? 'Project Header Badge' : (elem.label || elem.text || 'Element'));
      if (badge) { badge.textContent = isHallRoom ? 'Hall Room' : (isRoomBadge ? 'Title' : elem.type); badge.className = 'badge badge-primary'; }

      if (isHallRoom) {
        body.innerHTML = `
          <div class="form-group">
            <label class="form-label">Hall Name / Title</label>
            <input type="text" class="form-input" value="${elem.name || elem.label || ''}" oninput="layoutEditor.updateItemProp('name', this.value, true)" id="prop-hall-name">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xs);">
            <div class="form-group">
              <label class="form-label">Width</label>
              <div class="input-with-unit">
                <input type="number" class="form-input" step="1" min="10" max="200" value="${elem.width || 30}" oninput="layoutEditor.updateItemProp('width', parseFloat(this.value)||30, true)">
                <span class="input-unit">ft</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Depth</label>
              <div class="input-with-unit">
                <input type="number" class="form-input" step="1" min="10" max="200" value="${elem.height || 20}" oninput="layoutEditor.updateItemProp('height', parseFloat(this.value)||20, true)">
                <span class="input-unit">ft</span>
              </div>
            </div>
          </div>
          <p class="form-hint" style="margin-top: -6px; margin-bottom: var(--space-sm);">
            ${Units.formatDims(elem.width || 30, elem.height || 20)} &middot; ${Math.round((elem.width || 30)*(elem.height || 20)).toLocaleString('en-IN')} sq ft
          </p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xs);">
            <div class="form-group">
              <label class="form-label">X Position</label>
              <div class="input-with-unit">
                <input type="number" class="form-input" step="1" value="${Units.roundFt(elem.x)}" oninput="layoutEditor.updateItemProp('x', Units.roundFt(parseFloat(this.value)||0), true)">
                <span class="input-unit">ft</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Y Position</label>
              <div class="input-with-unit">
                <input type="number" class="form-input" step="1" value="${Units.roundFt(elem.y)}" oninput="layoutEditor.updateItemProp('y', Units.roundFt(parseFloat(this.value)||0), true)">
                <span class="input-unit">ft</span>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Orientation &amp; Rotation</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xs); margin-bottom: var(--space-xs);">
              <button type="button" class="btn btn-secondary btn-sm" onclick="layoutEditor.flipSelected()" title="Flip Orientation (F)" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 2 3 6 7 10"></polyline><polyline points="17 14 21 18 17 22"></polyline><line x1="3" y1="6" x2="21" y2="6"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>
                <span>Flip (F)</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="layoutEditor.rotateSelected()" title="Rotate +90° (R)" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                <span>Rotate +90°</span>
              </button>
            </div>
            <div style="display: flex; gap: var(--space-xs); align-items: center;">
              <input type="number" class="form-input" value="${elem.rotation || 0}" step="90" oninput="layoutEditor.updateItemProp('rotation', (parseFloat(this.value)||0)%360, true)">
              <span class="text-muted" style="font-size: 0.78rem;">deg</span>
            </div>
          </div>
        `;
      } else {
        body.innerHTML = `
          <div class="form-group">
            <label class="form-label">${isRoomBadge ? 'Project Name' : 'Label / Name'}</label>
            <input type="text" class="form-input" value="${elem.label || elem.text || ''}" oninput="layoutEditor.updateItemProp('text', this.value, true)" id="prop-element-text">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xs);">
            <div class="form-group">
              <label class="form-label">X Position</label>
              <div class="input-with-unit">
                <input type="number" class="form-input" step="0.5" value="${Units.roundFt(elem.x)}" oninput="layoutEditor.updateItemProp('x', Units.roundFt(parseFloat(this.value)||0), true)">
                <span class="input-unit">ft</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Y Position</label>
              <div class="input-with-unit">
                <input type="number" class="form-input" step="0.5" value="${Units.roundFt(elem.y)}" oninput="layoutEditor.updateItemProp('y', Units.roundFt(parseFloat(this.value)||0), true)">
                <span class="input-unit">ft</span>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Orientation &amp; Rotation</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xs); margin-bottom: var(--space-xs);">
              <button type="button" class="btn btn-secondary btn-sm" onclick="layoutEditor.flipSelected()" title="Flip Orientation (F)" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 2 3 6 7 10"></polyline><polyline points="17 14 21 18 17 22"></polyline><line x1="3" y1="6" x2="21" y2="6"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>
                <span>Flip (F)</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="layoutEditor.rotateSelected()" title="Rotate +90° (R)" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                <span>Rotate +90°</span>
              </button>
            </div>
            <div style="display: flex; gap: var(--space-xs); align-items: center;">
              <input type="number" class="form-input" value="${elem.rotation || 0}" step="90" oninput="layoutEditor.updateItemProp('rotation', (parseFloat(this.value)||0)%360, true)">
              <span class="text-muted" style="font-size: 0.78rem;">deg</span>
            </div>
          </div>
        `;
      }
    }
  },

  showEmptyProperties() {
    const badge = document.getElementById('inspector-badge');
    const headerTitle = document.getElementById('inspector-header-title');
    if (badge) badge.style.display = 'none';
    if (headerTitle) headerTitle.textContent = 'Inspector';

    document.getElementById('properties-body').innerHTML = `
      <p class="text-muted" style="font-size: 0.85rem; text-align: center; padding: var(--space-md) 0;">
        Select a stall, door, or label on the floor plan to edit its properties.
      </p>
    `;
  },

  updateItemProp(prop, value, skipRerenderProperties = false) {
    if (!this.selectedItem) return;
    const obj = this.selectedItem.obj;
    obj[prop] = value;

    if (prop === 'text' || prop === 'label') {
      obj.text = value;
      obj.label = value;
      if (obj.type === 'room_badge') {
        if (this.eventData) this.eventData.name = value;
      }
    }

    this.clampToBounds(obj, this.selectedItem.type);
    this.renderAllObjects();
    this.updateDirectoryList();

    if (!skipRerenderProperties) {
      this.showProperties(this.selectedItem);
    }
  },

  rotateSelected() {
    if (!this.selectedItem) return;
    const obj = this.selectedItem.obj;
    obj.rotation = ((obj.rotation || 0) + 90) % 360;
    this.clampToBounds(obj, this.selectedItem.type);
    this.renderAllObjects();
    this.showProperties(this.selectedItem);
    this.updateDirectoryList();
  },

  flipSelected() {
    if (!this.selectedItem) return;
    const { type, obj } = this.selectedItem;

    if (type === 'table') {
      if (obj.shape && obj.shape.startsWith('L')) {
        this.toggleInvertL();
        return;
      }
      // For rectangular tables / single / double / Pod / T-Stall:
      // Flip by swapping width & depth (or 180° rotation if square)
      const oldW = obj.width;
      const oldH = obj.height;
      obj.width = oldH;
      obj.height = oldW;
      this.clampToBounds(obj, 'table');
      this.renderAllObjects();
      this.showProperties(this.selectedItem);
      this.updateDirectoryList();
      showToast(`Stall ${obj.table_number} flipped (${obj.width}' × ${obj.height}')`, 'info');
      return;
    }

    if (type === 'element') {
      if (obj.type === 'door') {
        obj.flip = !obj.flip;
        obj.rotation = ((obj.rotation || 0) + 180) % 360;
        this.clampToBounds(obj, 'element');
        this.renderAllObjects();
        this.showProperties(this.selectedItem);
        this.updateDirectoryList();
        showToast('Door orientation flipped', 'info');
        return;
      }

      if (obj.width && obj.height && obj.width !== obj.height) {
        const oldW = obj.width;
        obj.width = obj.height;
        obj.height = oldW;
      } else {
        obj.rotation = ((obj.rotation || 0) + 180) % 360;
      }
      this.clampToBounds(obj, 'element');
      this.renderAllObjects();
      this.showProperties(this.selectedItem);
      this.updateDirectoryList();
      showToast('Component flipped', 'info');
    }
  },

  toggleInvertL() {
    if (!this.selectedItem || this.selectedItem.type !== 'table') return;
    const table = this.selectedItem.obj;
    const isCurrentlyInverted = table.shape === 'L-Stall-Inverted' || table.shape === 'L-Inverted';

    if (isCurrentlyInverted) {
      table.shape = 'L-Stall';
      if (table.label.includes('Inverted') || table.label.includes('⅃')) table.label = 'L-Stall (L)';
    } else {
      table.shape = 'L-Stall-Inverted';
      if (table.label.includes('L-Stall') || table.label === '') table.label = 'L-Inverted (⅃)';
    }

    this.renderAllObjects();
    this.showProperties(this.selectedItem);
    this.updateDirectoryList();
    showToast(`L-Shape inverted to ${isCurrentlyInverted ? 'Left-Hand L' : 'Right-Hand Inverted ⅃'}`, 'info');
  },

  duplicateSelected() {
    if (!this.selectedItem) return;

    if (this.selectedItem.type === 'table') {
      const copy = {
        ...this.selectedItem.obj,
        id: undefined,
        _tempId: 'table_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        table_number: this.getNextAvailableTableNum(),
        x: this.selectedItem.obj.x + 1,
        y: this.selectedItem.obj.y + 1,
        status: 'available'
      };
      this.clampToBounds(copy, 'table');
      this.tables.push(copy);
      this.renderAllObjects();
      this.selectObject('table', copy);
      this.updateDirectoryList();
      showToast(`Duplicated as Stall ${copy.table_number}`, 'success');
    } else {
      const copy = {
        ...this.selectedItem.obj,
        id: (this.selectedItem.obj.type || 'elem') + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        _tempId: undefined,
        x: this.selectedItem.obj.x + 1,
        y: this.selectedItem.obj.y + 1
      };
      this.clampToBounds(copy, 'element');
      this.elements.push(copy);
      this.renderAllObjects();
      this.selectObject('element', copy);
      this.updateDirectoryList();
      showToast(`Duplicated ${copy.label || copy.type}`, 'success');
    }
  },

  deleteSelected() {
    if (!this.selectedItem) return;

    if (this.selectedItem.type === 'table') {
      const table = this.selectedItem.obj;
      if (table.status === 'booked') {
        showToast('Cannot delete a reserved stall.', 'error');
        return;
      }
      const idx = this.tables.indexOf(table);
      if (idx > -1) {
        const num = table.table_number;
        this.tables.splice(idx, 1);
        this.deselect();
        showToast(`Stall ${num} removed`, 'success');
      }
    } else {
      const elem = this.selectedItem.obj;
      if (elem.type === 'room_badge') {
        showToast('Project header badge cannot be deleted.', 'info');
        return;
      }
      const idx = this.elements.indexOf(elem);
      if (idx > -1) {
        const label = elem.label || elem.text || elem.type;
        this.elements.splice(idx, 1);
        this.deselect();
        showToast(`Removed "${label}"`, 'success');
      }
    }
  },

  /* ----------------------------------------------------
     DIRECTORY LIST
     ---------------------------------------------------- */
  filterDirectory(filter) {
    this.directoryFilter = filter;
    const tabs = document.querySelectorAll('.dir-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    this.updateDirectoryList();
  },

  updateDirectoryList() {
    const list = document.getElementById('table-list');
    const totalCount = document.getElementById('total-items-count');
    if (!list) return;

    const total = this.tables.length + this.elements.length;
    if (totalCount) totalCount.textContent = total;

    if (total === 0) {
      list.innerHTML = '<p class="text-muted" style="font-size: 0.85rem; text-align: center;">No items placed yet</p>';
      return;
    }

    let items = [];

    if (this.directoryFilter === 'all' || this.directoryFilter === 'stalls') {
      this.tables.forEach(t => {
        items.push({
          type: 'table',
          id: String(t.id || t._tempId),
          obj: t,
          title: `Stall ${t.table_number}`,
          subtitle: `${Units.formatFeetShort(t.width)} × ${Units.formatFeetShort(t.height)} · ${t.label || t.shape}`,
          status: t.status
        });
      });
    }

    if (this.directoryFilter === 'all' || this.directoryFilter === 'elements') {
      this.elements.forEach(el => {
        let tag = '[Sign]';
        let title = el.label || el.text || el.type;
        if (el.type === 'room_badge') tag = '[Title]';
        else if (el.type === 'door') tag = el.doorType === 'exit' ? '[Exit]' : (el.doorType === 'window' ? '[Window]' : '[Entrance]');
        else if (el.type === 'pillar_square' || el.type === 'pillar_round') tag = '[Column]';
        else if (el.type === 'stage') tag = '[Stage]';
        else if (el.type === 'arrow') tag = '[Arrow]';

        items.push({
          type: 'element',
          id: String(el.id || el._tempId),
          obj: el,
          title: `${tag} ${title}`,
          subtitle: `${Units.formatFeetShort(el.width || 4)} × ${Units.formatFeetShort(el.height || 2)}`,
          status: 'element'
        });
      });
    }

    const selectedId = this.selectedItem ? String(this.selectedItem.obj.id || this.selectedItem.obj._tempId) : null;

    list.innerHTML = items.map(item => {
      const isSelected = String(item.id) === String(selectedId);
      const statusDot = item.status === 'booked'
        ? '<span style="width:6px;height:6px;border-radius:50%;background:var(--status-booked);display:inline-block;"></span> '
        : '';

      return `
        <div class="table-list-item ${isSelected ? 'selected' : ''}" onclick="layoutEditor.selectById('${item.type}', '${item.id}')">
          <span>${statusDot}<strong>${item.title}</strong></span>
          <span style="color: var(--text-muted); font-size: 0.75rem;">${item.subtitle}</span>
        </div>
      `;
    }).join('');
  },

  selectById(type, id) {
    if (type === 'table') {
      const table = this.tables.find(t => String(t.id || t._tempId) === String(id));
      if (table) this.selectObject('table', table);
    } else {
      const elem = this.elements.find(e => String(e.id || e._tempId) === String(id));
      if (elem) this.selectObject('element', elem);
    }
  },

  /* ----------------------------------------------------
     DYNAMIC SMART ALIGNMENT GUIDES & SNAPPING
     ---------------------------------------------------- */
  calculateSnapAndGuides(targetObj, rawX, rawY) {
    const layer = document.getElementById('editor-guides-layer');
    if (layer) layer.innerHTML = '';

    let snappedX = rawX;
    let snappedY = rawY;

    if (this.snapGridFt > 0) {
      snappedX = Math.round(rawX / this.snapGridFt) * this.snapGridFt;
      snappedY = Math.round(rawY / this.snapGridFt) * this.snapGridFt;
    }

    if (!this.smartGuidesEnabled) return { x: snappedX, y: snappedY };

    const ns = 'http://www.w3.org/2000/svg';
    const hallW = this.hallWidthFt();
    const hallH = this.hallHeightFt();

    const targetW = targetObj.width || 4;
    const targetH = targetObj.height || 2;
    const targetRot = ((targetObj.rotation || 0) % 360 + 360) % 360;
    const targetIsRot90 = targetRot === 90 || targetRot === 270;
    const targetVisW = targetIsRot90 ? targetH : targetW;
    const targetVisH = targetIsRot90 ? targetW : targetH;
    const targetCenterX = rawX + targetW / 2;
    const targetCenterY = rawY + targetH / 2;

    const targetPointsX = [
      { type: 'left', pos: targetCenterX - targetVisW / 2 },
      { type: 'center', pos: targetCenterX },
      { type: 'right', pos: targetCenterX + targetVisW / 2 }
    ];

    const targetPointsY = [
      { type: 'top', pos: targetCenterY - targetVisH / 2 },
      { type: 'center', pos: targetCenterY },
      { type: 'bottom', pos: targetCenterY + targetVisH / 2 }
    ];

    let guideX = null;
    let guideY = null;

    const targetId = String(targetObj.id || targetObj._tempId);
    const allRefs = [
      ...this.tables.filter(t => String(t.id || t._tempId) !== targetId),
      ...this.elements.filter(e => String(e.id || e._tempId) !== targetId)
    ];

    for (const ref of allRefs) {
      const rW = ref.width || 4;
      const rH = ref.height || 2;
      const refRot = ((ref.rotation || 0) % 360 + 360) % 360;
      const refIsRot90 = refRot === 90 || refRot === 270;
      const refVisW = refIsRot90 ? rH : rW;
      const refVisH = refIsRot90 ? rW : rH;
      const refCenterX = ref.x + rW / 2;
      const refCenterY = ref.y + rH / 2;

      const refPointsX = [refCenterX - refVisW / 2, refCenterX, refCenterX + refVisW / 2];
      const refPointsY = [refCenterY - refVisH / 2, refCenterY, refCenterY + refVisH / 2];

      if (guideX === null) {
        for (const tp of targetPointsX) {
          for (const rp of refPointsX) {
            if (Math.abs(tp.pos - rp) <= this.snapThresholdFt) {
              let desiredCenterX = rp;
              if (tp.type === 'left') desiredCenterX = rp + targetVisW / 2;
              else if (tp.type === 'center') desiredCenterX = rp;
              else if (tp.type === 'right') desiredCenterX = rp - targetVisW / 2;

              snappedX = desiredCenterX - targetW / 2;
              guideX = rp;
              break;
            }
          }
          if (guideX !== null) break;
        }
      }

      if (guideY === null) {
        for (const tp of targetPointsY) {
          for (const rp of refPointsY) {
            if (Math.abs(tp.pos - rp) <= this.snapThresholdFt) {
              let desiredCenterY = rp;
              if (tp.type === 'top') desiredCenterY = rp + targetVisH / 2;
              else if (tp.type === 'center') desiredCenterY = rp;
              else if (tp.type === 'bottom') desiredCenterY = rp - targetVisH / 2;

              snappedY = desiredCenterY - targetH / 2;
              guideY = rp;
              break;
            }
          }
          if (guideY !== null) break;
        }
      }
    }

    if (layer) {
      if (guideX !== null) {
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', this.px(guideX)); line.setAttribute('y1', '-500');
        line.setAttribute('x2', this.px(guideX)); line.setAttribute('y2', this.px(hallH + 500));
        line.setAttribute('class', 'smart-guide-line');
        layer.appendChild(line);
      }

      if (guideY !== null) {
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', '-500'); line.setAttribute('y1', this.px(guideY));
        line.setAttribute('x2', this.px(hallW + 500)); line.setAttribute('y2', this.px(guideY));
        line.setAttribute('class', 'smart-guide-line');
        layer.appendChild(line);
      }
    }

    return { x: snappedX, y: snappedY };
  },

  clampToBounds(obj, type = 'table') {
    if (!obj || !this.eventData) return;
    const hallW = this.hallWidthFt();
    const hallH = this.hallHeightFt();

    let maxCanvasW = hallW;
    let maxCanvasH = hallH;
    let minCanvasX = 0;
    let minCanvasY = 0;

    this.elements.forEach(el => {
      if (el.type === 'hall_room') {
        const ex = parseFloat(el.x) || 0;
        const ey = parseFloat(el.y) || 0;
        const ew = parseFloat(el.width) || 30;
        const eh = parseFloat(el.height) || 20;
        if (ex < minCanvasX) minCanvasX = ex;
        if (ey < minCanvasY) minCanvasY = ey;
        if (ex + ew > maxCanvasW) maxCanvasW = ex + ew;
        if (ey + eh > maxCanvasH) maxCanvasH = ey + eh;
      }
    });

    const w = obj.width || 4;
    const h = obj.height || 2;
    const rot = ((obj.rotation || 0) % 360 + 360) % 360;
    const isRot90 = rot === 90 || rot === 270;

    if (type === 'table') {
      const minX = isRot90 ? (h - w) / 2 + minCanvasX - ELEMENT_OUTSIDE_MARGIN_FT : minCanvasX - ELEMENT_OUTSIDE_MARGIN_FT;
      const maxX = maxCanvasW + ELEMENT_OUTSIDE_MARGIN_FT - (isRot90 ? (w + h) / 2 : w);
      const minY = isRot90 ? (w - h) / 2 + minCanvasY - ELEMENT_OUTSIDE_MARGIN_FT : minCanvasY - ELEMENT_OUTSIDE_MARGIN_FT;
      const maxY = maxCanvasH + ELEMENT_OUTSIDE_MARGIN_FT - (isRot90 ? (w + h) / 2 : h);

      obj.x = Units.roundFt(Math.max(minX, Math.min(maxX, obj.x)));
      obj.y = Units.roundFt(Math.max(minY, Math.min(maxY, obj.y)));
    } else {
      const minX = -ELEMENT_OUTSIDE_MARGIN_FT;
      const maxX = maxCanvasW + ELEMENT_OUTSIDE_MARGIN_FT - (isRot90 ? h : w);
      const minY = -ELEMENT_OUTSIDE_MARGIN_FT;
      const maxY = maxCanvasH + ELEMENT_OUTSIDE_MARGIN_FT - (isRot90 ? w : h);

      obj.x = Units.roundFt(Math.max(minX, Math.min(maxX, obj.x)));
      obj.y = Units.roundFt(Math.max(minY, Math.min(maxY, obj.y)));
    }
  },

  clearGuides() {
    const layer = document.getElementById('editor-guides-layer');
    if (layer) layer.innerHTML = '';
  },

  updateFloatingActionsPosition() {
    const floatingEl = document.getElementById('table-floating-actions');
    if (!floatingEl) return;

    if (!this.selectedItem) {
      floatingEl.classList.add('hidden');
      return;
    }

    try {
      const obj = this.selectedItem.obj;
      const w = obj.width || 4;
      const cx = this.px(obj.x + (w / 2));
      const topY = this.px(obj.y) - 15;

      const pt = this.svg.createSVGPoint();
      pt.x = cx;
      pt.y = topY;

      const screenPt = pt.matrixTransform(this.svg.getScreenCTM());
      const canvasRect = this.canvas.getBoundingClientRect();

      const left = screenPt.x - canvasRect.left;
      const top = screenPt.y - canvasRect.top;

      floatingEl.style.left = `${left}px`;
      floatingEl.style.top = `${top}px`;
      floatingEl.classList.remove('hidden');
    } catch (e) {
      floatingEl.classList.add('hidden');
    }
  },

  setSnapGrid(val) {
    this.snapGridFt = parseFloat(val) || 0;
    showToast(`Grid snap set to ${SNAP_GRID_FT[String(this.snapGridFt)] || Units.formatFeet(this.snapGridFt)}`, 'info');
  },

  toggleSmartGuides() {
    this.smartGuidesEnabled = !this.smartGuidesEnabled;
    const btn = document.getElementById('toggle-guides-btn');
    if (btn) {
      btn.textContent = `Guides: ${this.smartGuidesEnabled ? 'ON' : 'OFF'}`;
      btn.classList.toggle('active', this.smartGuidesEnabled);
    }
    showToast(`Smart alignment guides ${this.smartGuidesEnabled ? 'enabled' : 'disabled'}`, 'info');
  },

  /* ----------------------------------------------------
     SAVE FLOOR PLAN
     ---------------------------------------------------- */
  async saveLayout() {
    const saveBtn = document.getElementById('save-layout-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const tablesPayload = this.tables.map(t => ({
        id: t.id || undefined,
        table_number: t.table_number,
        label: t.label,
        size: t.size,
        price: t.price || 0,
        x: Units.roundFt(t.x),
        y: Units.roundFt(t.y),
        width: Units.clampStallFt(t.width, Units.DEFAULT_STALL_WIDTH_FT),
        height: Units.clampStallFt(t.height, Units.DEFAULT_STALL_HEIGHT_FT),
        rotation: t.rotation || 0,
        shape: t.shape || 'rect',
        status: t.status || 'available'
      }));

      const elementsPayload = this.elements.map(el => ({
        id: el.id || undefined,
        _tempId: el._tempId,
        type: el.type,
        doorType: el.doorType,
        text: el.text,
        fontSize: el.fontSize,
        fontWeight: el.fontWeight,
        color: el.color,
        badge: el.badge,
        label: el.label,
        width: el.width,
        height: el.height,
        x: Units.roundFt(el.x),
        y: Units.roundFt(el.y),
        rotation: el.rotation || 0
      }));

      const res = await fetch(`/api/admin/events/${this.eventId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tables: tablesPayload,
          hall_elements: elementsPayload,
          hall_width: this.hallWidthFt(),
          hall_height: this.hallHeightFt(),
          hall_rotation: this.eventData.hall_rotation || 0
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save layout');
      }

      const result = await res.json();
      this.tables = result.tables;
      if (result.event) {
        this.eventData = result.event;
        if (result.event.hall_elements) {
          try {
            this.elements = Array.isArray(result.event.hall_elements)
              ? result.event.hall_elements
              : JSON.parse(result.event.hall_elements);
          } catch (e) { }
        }
      }

      this.elements.forEach((el, idx) => {
        if (!el.id) el.id = 'elem_' + Date.now() + '_' + idx;
      });

      this.ensureRoomBadgeElement();
      this.deselect();
      showToast('Floor plan saved successfully', 'success');

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Floor Plan';
    }
  },

  /* ----------------------------------------------------
     EVENT BINDINGS & GESTURES
     ---------------------------------------------------- */
  bindEvents() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown-wrapper')) {
        this.closeFloorRotateMenu();
      }
    });

    this.svg.addEventListener('mousedown', (e) => {
      // Rotate handle knob or curved rotation arc
      if (e.target.dataset.rotateKnob || e.target.closest('[data-rotate-knob]')) {
        this.rotateSelected();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Check if clicked a table
      const groupTable = e.target.closest('[data-table-id]');
      if (groupTable) {
        const id = groupTable.getAttribute('data-table-id');
        const table = this.tables.find(t => String(t.id || t._tempId) === String(id));
        if (table) {
          this.selectObject('table', table);

          if (table.status !== 'booked') {
            this.isDragging = true;
            this.dragTarget = { type: 'table', obj: table };
            const pt = this.svgPointFt(e.clientX, e.clientY);
            this.dragOffset = { x: pt.x - table.x, y: pt.y - table.y };
          }

          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Check if clicked an architectural element (door, text, room badge, structure)
      const groupElem = e.target.closest('[data-element-id]');
      if (groupElem) {
        const id = groupElem.getAttribute('data-element-id');
        const elem = this.elements.find(el => String(el.id || el._tempId) === String(id));
        if (elem) {
          this.selectObject('element', elem);

          this.isDragging = true;
          this.dragTarget = { type: 'element', obj: elem };
          const pt = this.svgPointFt(e.clientX, e.clientY);
          this.dragOffset = { x: pt.x - elem.x, y: pt.y - elem.y };

          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Clicked empty canvas space
      this.deselect();

      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.dragTarget) {
        const obj = this.dragTarget.obj;
        const type = this.dragTarget.type;
        const pt = this.svgPointFt(e.clientX, e.clientY);
        const rawX = pt.x - this.dragOffset.x;
        const rawY = pt.y - this.dragOffset.y;

        const snapped = this.calculateSnapAndGuides(obj, rawX, rawY);
        obj.x = snapped.x;
        obj.y = snapped.y;
        this.clampToBounds(obj, type);

        this.renderAllObjects();

        const propX = document.getElementById('prop-x');
        const propY = document.getElementById('prop-y');
        if (propX) propX.value = Units.roundFt(obj.x);
        if (propY) propY.value = Units.roundFt(obj.y);
        return;
      }

      if (this.isPanning) {
        const dx = (e.clientX - this.panStart.x) * (this.viewBox.w / this.canvas.clientWidth);
        const dy = (e.clientY - this.panStart.y) * (this.viewBox.h / this.canvas.clientHeight);
        this.viewBox.x -= dx;
        this.viewBox.y -= dy;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.applyViewBox();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.dragTarget = null;
        this.clearGuides();
      }
      this.isPanning = false;
    });

    // Zoom on wheel
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = this.viewBox.x + (e.clientX - rect.left) / rect.width * this.viewBox.w;
      const mouseY = this.viewBox.y + (e.clientY - rect.top) / rect.height * this.viewBox.h;

      const newW = this.viewBox.w * factor;
      const newH = this.viewBox.h * factor;

      this.viewBox.x = mouseX - (mouseX - this.viewBox.x) * (newW / this.viewBox.w);
      this.viewBox.y = mouseY - (mouseY - this.viewBox.y) * (newH / this.viewBox.h);
      this.viewBox.w = newW;
      this.viewBox.h = newH;
      this.applyViewBox();
    }, { passive: false });

    // Keyboard Shortcuts: R, Shift+D, Del/Backspace, Esc, Ctrl+S
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        this.saveLayout();
      } else if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'x' || e.key === 'X') {
        this.deleteSelected();
      } else if (e.key === 'd' || e.key === 'D') {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.duplicateSelected();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        this.rotateSelected();
      } else if (e.key === 'f' || e.key === 'F') {
        this.flipSelected();
      } else if (e.key === 'Escape') {
        this.deselect();
      }
    });
  },

  svgPoint(clientX, clientY) {
    const pt = this.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = this.svg.getScreenCTM().inverse();
    return pt.matrixTransform(ctm);
  },

  svgPointFt(clientX, clientY) {
    const pt = this.svgPoint(clientX, clientY);
    return { x: Units.pxToFt(pt.x), y: Units.pxToFt(pt.y) };
  },

  zoomIn() {
    const cx = this.viewBox.x + this.viewBox.w / 2;
    const cy = this.viewBox.y + this.viewBox.h / 2;
    this.viewBox.w *= 0.8;
    this.viewBox.h *= 0.8;
    this.viewBox.x = cx - this.viewBox.w / 2;
    this.viewBox.y = cy - this.viewBox.h / 2;
    this.applyViewBox();
  },

  zoomOut() {
    const cx = this.viewBox.x + this.viewBox.w / 2;
    const cy = this.viewBox.y + this.viewBox.h / 2;
    this.viewBox.w *= 1.25;
    this.viewBox.h *= 1.25;
    this.viewBox.x = cx - this.viewBox.w / 2;
    this.viewBox.y = cy - this.viewBox.h / 2;
    this.applyViewBox();
  },

  resetView() {
    this.setupViewBox();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  layoutEditor.init();
});

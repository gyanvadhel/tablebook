/**
 * TableBook — Blender-Style Architectural Layout Engine
 * Precision dual-level grid, smart alignment guides, viewport HUD, and CAD shortcuts
 *
 * Every dimension held on a table object (x, y, width, height) is in FEET.
 * Feet become SVG drawing units only at the render boundary, via px().
 */

// Stall footprints in feet
const STALL_DEFAULTS = {
  rect_short: { width: 3, height: 4, label: 'Standard Short', size: 'medium', shape: 'rect' },
  rect_tall:  { width: 3, height: 7, label: 'Standard Tall', size: 'large', shape: 'rect' },
  'L-Stall':  { width: 6, height: 5, label: 'L-Stall', size: 'large', shape: 'L-Stall' }
};

// Grid spacing options, in feet
const SNAP_GRID_FT = { '1': '1 ft', '0.5': '6 in', '0.25': '3 in', '0': 'Off' };

const HALL_PADDING_FT = 4;

const layoutEditor = {
  svg: null,
  canvas: null,
  eventId: null,
  eventData: null,
  tables: [],
  selectedTable: null,

  // Snap & Guide Settings (feet)
  snapGridFt: 1,
  smartGuidesEnabled: true,
  snapThresholdFt: 0.4,

  // Drag & Grab state
  isDragging: false,
  dragTable: null,
  dragOffset: { x: 0, y: 0 },
  grabMode: false,

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
      if (!isNaN(num) && num > 0) {
        existingNums.add(num);
      }
    });

    let nextNum = 1;
    while (existingNums.has(nextNum)) {
      nextNum++;
    }
    return String(nextNum);
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
      const events = await eventRes.json();
      this.eventData = events.find(e => e.id === parseInt(this.eventId));

      if (!this.eventData) {
        showToast('Event not found', 'error');
        return;
      }

      document.getElementById('editor-title').textContent = `Floor Plan: ${this.eventData.name}`;
      const hallW = this.hallWidthFt();
      const hallH = this.hallHeightFt();
      document.getElementById('editor-subtitle').textContent =
        `${this.eventData.venue || 'No venue set'} · Hall: ${Units.formatDims(hallW, hallH)} (${Units.formatArea(hallW, hallH)})`;

      const tablesRes = await fetch(`/api/admin/events/${this.eventId}/tables`);
      this.tables = await tablesRes.json();

      this.setupViewBox();
      this.renderHall();
      this.renderAllTables();
      this.updateTableList();
      this.bindEvents();

    } catch (err) {
      console.error('Editor init error:', err);
      showToast('Failed to load layout editor', 'error');
    }
  },

  setupViewBox() {
    const w = this.px(this.hallWidthFt());
    const h = this.px(this.hallHeightFt());
    const padding = this.px(HALL_PADDING_FT);

    this.viewBox = { x: -padding, y: -padding, w: w + padding * 2, h: h + padding * 2 };
    this.originalViewBox = { ...this.viewBox };
    this.applyViewBox();
  },

  applyViewBox() {
    this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
    this.updateFloatingActionsPosition();
  },

  renderHall() {
    const widthFt = this.hallWidthFt();
    const heightFt = this.hallHeightFt();
    const w = this.px(widthFt);
    const h = this.px(heightFt);
    const minor = this.px(1);   // 1 ft
    const major = this.px(5);   // 5 ft
    const ns = 'http://www.w3.org/2000/svg';

    this.svg.innerHTML = '';

    // Defs: Major & Minor Grid Pattern
    const defs = document.createElementNS(ns, 'defs');

    // Minor Grid Pattern — one square per foot
    const minorPattern = document.createElementNS(ns, 'pattern');
    minorPattern.setAttribute('id', 'grid-minor');
    minorPattern.setAttribute('width', minor);
    minorPattern.setAttribute('height', minor);
    minorPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    minorPattern.innerHTML = `
      <path d="M ${minor} 0 L 0 0 0 ${minor}" fill="none" class="grid-minor-line" />
    `;

    // Major Grid Pattern — one square per 5 ft
    const majorPattern = document.createElementNS(ns, 'pattern');
    majorPattern.setAttribute('id', 'grid-major');
    majorPattern.setAttribute('width', major);
    majorPattern.setAttribute('height', major);
    majorPattern.setAttribute('patternUnits', 'userSpaceOnUse');
    majorPattern.innerHTML = `
      <rect width="${major}" height="${major}" fill="url(#grid-minor)"/>
      <path d="M ${major} 0 L 0 0 0 ${major}" fill="none" class="grid-major-line" />
    `;

    defs.appendChild(minorPattern);
    defs.appendChild(majorPattern);
    this.svg.appendChild(defs);

    // Floor Background
    const floor = document.createElementNS(ns, 'rect');
    floor.setAttribute('x', '0'); floor.setAttribute('y', '0');
    floor.setAttribute('width', w); floor.setAttribute('height', h);
    floor.setAttribute('fill', 'url(#grid-major)');
    floor.setAttribute('rx', '4');
    this.svg.appendChild(floor);

    // Primary Blender Origin Axis Lines (Red = X, Green = Y)
    const axisX = document.createElementNS(ns, 'line');
    axisX.setAttribute('x1', '0'); axisX.setAttribute('y1', '0');
    axisX.setAttribute('x2', w); axisX.setAttribute('y2', '0');
    axisX.setAttribute('class', 'grid-axis-x');
    this.svg.appendChild(axisX);

    const axisY = document.createElementNS(ns, 'line');
    axisY.setAttribute('x1', '0'); axisY.setAttribute('y1', '0');
    axisY.setAttribute('x2', '0'); axisY.setAttribute('y2', h);
    axisY.setAttribute('class', 'grid-axis-y');
    this.svg.appendChild(axisY);

    // Outer Hall Boundary
    const boundary = document.createElementNS(ns, 'rect');
    boundary.setAttribute('x', '0'); boundary.setAttribute('y', '0');
    boundary.setAttribute('width', w); boundary.setAttribute('height', h);
    boundary.setAttribute('class', 'hall-boundary'); boundary.setAttribute('rx', '4');
    this.svg.appendChild(boundary);

    // Dimension labels, in feet
    const labelW = document.createElementNS(ns, 'text');
    labelW.setAttribute('x', w / 2); labelW.setAttribute('y', h + 25);
    labelW.setAttribute('text-anchor', 'middle'); labelW.setAttribute('fill', '#94a3b8');
    labelW.setAttribute('font-size', '10'); labelW.setAttribute('font-family', 'Inter, sans-serif');
    labelW.textContent = Units.formatFeet(widthFt);
    this.svg.appendChild(labelW);

    const labelH = document.createElementNS(ns, 'text');
    labelH.setAttribute('x', -25); labelH.setAttribute('y', h / 2);
    labelH.setAttribute('text-anchor', 'middle'); labelH.setAttribute('fill', '#94a3b8');
    labelH.setAttribute('font-size', '10'); labelH.setAttribute('font-family', 'Inter, sans-serif');
    labelH.setAttribute('transform', `rotate(-90, -25, ${h / 2})`);
    labelH.textContent = Units.formatFeet(heightFt);
    this.svg.appendChild(labelH);

    // Layer Groups
    const tablesLayer = document.createElementNS(ns, 'g');
    tablesLayer.setAttribute('id', 'editor-tables-layer');
    this.svg.appendChild(tablesLayer);

    const guidesLayer = document.createElementNS(ns, 'g');
    guidesLayer.setAttribute('id', 'editor-guides-layer');
    this.svg.appendChild(guidesLayer);
  },

  renderAllTables() {
    const layer = document.getElementById('editor-tables-layer');
    if (!layer) return;
    layer.innerHTML = '';
    this.tables.forEach(t => this.renderTableElement(t));
    this.updateFloatingActionsPosition();
  },

  renderTableElement(table) {
    const ns = 'http://www.w3.org/2000/svg';
    const layer = document.getElementById('editor-tables-layer');

    const group = document.createElementNS(ns, 'g');
    group.setAttribute('class', `table-group table-${table.status || 'available'}`);
    group.setAttribute('data-table-id', table.id || table._tempId);
    group.style.cursor = 'move';

    const cx = this.px(table.x + (table.width / 2));
    const cy = this.px(table.y + (table.height / 2));

    // Group Rotation around center
    if (table.rotation) {
      group.setAttribute('transform', `rotate(${table.rotation}, ${cx}, ${cy})`);
    }

    const shapeInfo = this.renderStallShape(table, ns);
    group.appendChild(shapeInfo.el);

    // Table number label — counter rotate so text stays perfectly upright and readable
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', shapeInfo.textX);
    label.setAttribute('y', shapeInfo.textY);
    label.setAttribute('class', 'table-number');
    label.textContent = table.table_number;

    if (table.rotation) {
      label.setAttribute('transform', `rotate(${-table.rotation}, ${shapeInfo.textX}, ${shapeInfo.textY})`);
    }
    group.appendChild(label);

    // Selection indicators if selected
    const selectedId = this.selectedTable ? (this.selectedTable.id || this.selectedTable._tempId) : null;
    const thisId = table.id || table._tempId;

    if (selectedId && selectedId === thisId) {
      group.classList.remove('table-available');
      group.classList.add('table-selected');

      // SVG Rotation Knob handle at top center of table
      const handleLine = document.createElementNS(ns, 'line');
      const knobY = this.px(table.y) - 18;
      handleLine.setAttribute('x1', cx);
      handleLine.setAttribute('y1', this.px(table.y));
      handleLine.setAttribute('x2', cx);
      handleLine.setAttribute('y2', knobY);
      handleLine.setAttribute('stroke', '#0f172a');
      handleLine.setAttribute('stroke-width', '1.5');
      handleLine.setAttribute('stroke-dasharray', '2 2');
      group.appendChild(handleLine);

      const handleKnob = document.createElementNS(ns, 'circle');
      handleKnob.setAttribute('cx', cx);
      handleKnob.setAttribute('cy', knobY);
      handleKnob.setAttribute('r', '7');
      handleKnob.setAttribute('fill', '#0f172a');
      handleKnob.setAttribute('stroke', '#ffffff');
      handleKnob.setAttribute('stroke-width', '1.5');
      handleKnob.setAttribute('class', 'rotate-handle-knob');
      handleKnob.setAttribute('data-rotate-knob', 'true');
      if (table.rotation) {
        handleKnob.setAttribute('transform', `rotate(${-table.rotation}, ${cx}, ${knobY})`);
      }
      group.appendChild(handleKnob);
    }

    layer.appendChild(group);
  },

  renderStallShape(table, ns) {
    // Geometry is stored in feet; the SVG path below is in drawing units
    const shape = table.shape || 'rect';
    const x = this.px(table.x);
    const y = this.px(table.y);
    const w = this.px(table.width || Units.DEFAULT_STALL_WIDTH_FT);
    const h = this.px(table.height || Units.DEFAULT_STALL_HEIGHT_FT);
    const armH = Math.min(this.px(2), h * 0.45);
    const armW = Math.min(this.px(3), w * 0.5);

    let pathD = null;
    let textX = x + w / 2;
    let textY = y + h / 2;

    if (shape === 'L_TOP_LEFT') {
      pathD = `M ${x} ${y} H ${x + w} V ${y + h} H ${x + w - armW} V ${y + armH} H ${x} Z`;
      textX = x + w - (armW / 2);
      textY = y + armH + (h - armH) / 2;
    } else if (shape === 'L_TOP_RIGHT') {
      pathD = `M ${x} ${y} H ${x + w} V ${y + armH} H ${x + armW} V ${y + h} H ${x} Z`;
      textX = x + (armW / 2);
      textY = y + armH + (h - armH) / 2;
    } else if (shape === 'L_BOT_RIGHT') {
      pathD = `M ${x} ${y} H ${x + armW} V ${y + h - armH} H ${x + w} V ${y + h} H ${x} Z`;
      textX = x + (armW / 2);
      textY = y + (h - armH) / 2;
    } else if (shape === 'L-Stall' || shape === 'L_BOT_LEFT' || shape.startsWith('L')) {
      pathD = `M ${x + w - armW} ${y} H ${x + w} V ${y + h} H ${x} V ${y + h - armH} H ${x + w - armW} Z`;
      textX = x + w - (armW / 2);
      textY = y + (h - armH) / 2;
    }

    if (pathD) {
      const el = document.createElementNS(ns, 'path');
      el.setAttribute('d', pathD);
      el.setAttribute('class', 'table-shape');
      el.setAttribute('stroke-linejoin', 'round');
      el.setAttribute('stroke-linecap', 'round');
      return { el, textX, textY };
    }

    // Default rectangle
    const el = document.createElementNS(ns, 'rect');
    el.setAttribute('x', x); el.setAttribute('y', y);
    el.setAttribute('width', w); el.setAttribute('height', h);
    el.setAttribute('class', 'table-shape');
    el.setAttribute('rx', '4'); el.setAttribute('ry', '4');
    return { el, textX, textY };
  },

  // Dynamic Smart Alignment Guide Engine
  calculateSnapAndGuides(targetTable, rawX, rawY) {
    const layer = document.getElementById('editor-guides-layer');
    if (layer) layer.innerHTML = '';

    let snappedX = rawX;
    let snappedY = rawY;

    // Apply grid snap first (grid spacing is in feet)
    if (this.snapGridFt > 0) {
      snappedX = Math.round(rawX / this.snapGridFt) * this.snapGridFt;
      snappedY = Math.round(rawY / this.snapGridFt) * this.snapGridFt;
    }

    if (!this.smartGuidesEnabled) {
      return { x: snappedX, y: snappedY };
    }

    const ns = 'http://www.w3.org/2000/svg';
    const hallW = this.hallWidthFt();
    const hallH = this.hallHeightFt();

    const targetW = targetTable.width;
    const targetH = targetTable.height;

    // Target edges & center
    const targetPointsX = [
      { type: 'left', pos: rawX },
      { type: 'center', pos: rawX + targetW / 2 },
      { type: 'right', pos: rawX + targetW }
    ];

    const targetPointsY = [
      { type: 'top', pos: rawY },
      { type: 'center', pos: rawY + targetH / 2 },
      { type: 'bottom', pos: rawY + targetH }
    ];

    let guideX = null;
    let guideY = null;

    // Collect all reference points from other tables
    const refTables = this.tables.filter(t => (t.id || t._tempId) !== (targetTable.id || targetTable._tempId));

    for (const ref of refTables) {
      const refPointsX = [ref.x, ref.x + ref.width / 2, ref.x + ref.width];
      const refPointsY = [ref.y, ref.y + ref.height / 2, ref.y + ref.height];

      // Check X alignment
      if (guideX === null) {
        for (const tp of targetPointsX) {
          for (const rp of refPointsX) {
            if (Math.abs(tp.pos - rp) <= this.snapThresholdFt) {
              if (tp.type === 'left') snappedX = rp;
              else if (tp.type === 'center') snappedX = rp - targetW / 2;
              else if (tp.type === 'right') snappedX = rp - targetW;
              guideX = rp;
              break;
            }
          }
          if (guideX !== null) break;
        }
      }

      // Check Y alignment
      if (guideY === null) {
        for (const tp of targetPointsY) {
          for (const rp of refPointsY) {
            if (Math.abs(tp.pos - rp) <= this.snapThresholdFt) {
              if (tp.type === 'top') snappedY = rp;
              else if (tp.type === 'center') snappedY = rp - targetH / 2;
              else if (tp.type === 'bottom') snappedY = rp - targetH;
              guideY = rp;
              break;
            }
          }
          if (guideY !== null) break;
        }
      }
    }

    // Render guide lines if snapped
    if (layer) {
      if (guideX !== null) {
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', this.px(guideX)); line.setAttribute('y1', '0');
        line.setAttribute('x2', this.px(guideX)); line.setAttribute('y2', this.px(hallH));
        line.setAttribute('class', 'smart-guide-line');
        layer.appendChild(line);
      }

      if (guideY !== null) {
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', '0'); line.setAttribute('y1', this.px(guideY));
        line.setAttribute('x2', this.px(hallW)); line.setAttribute('y2', this.px(guideY));
        line.setAttribute('class', 'smart-guide-line');
        layer.appendChild(line);
      }
    }

    return { x: snappedX, y: snappedY };
  },

  // Boundary Constraint Engine: Prevents stalls from exceeding hall perimeter
  clampTableToBounds(table) {
    if (!table || !this.eventData) return;
    const hallW = this.hallWidthFt();
    const hallH = this.hallHeightFt();

    let effW = table.width || Units.DEFAULT_STALL_WIDTH_FT;
    let effH = table.height || Units.DEFAULT_STALL_HEIGHT_FT;

    // Handle 90/270 degree rotation dimension swaps
    if (table.rotation === 90 || table.rotation === 270) {
      effW = table.height || Units.DEFAULT_STALL_HEIGHT_FT;
      effH = table.width || Units.DEFAULT_STALL_WIDTH_FT;
    }

    const cx = table.x + (table.width / 2);
    const cy = table.y + (table.height / 2);

    const minCx = effW / 2;
    const maxCx = hallW - effW / 2;
    const minCy = effH / 2;
    const maxCy = hallH - effH / 2;

    const clampedCx = Math.max(minCx, Math.min(maxCx, cx));
    const clampedCy = Math.max(minCy, Math.min(maxCy, cy));

    table.x = Units.roundFt(clampedCx - table.width / 2);
    table.y = Units.roundFt(clampedCy - table.height / 2);
  },

  clearGuides() {
    const layer = document.getElementById('editor-guides-layer');
    if (layer) layer.innerHTML = '';
  },

  addTable(stallType = 'rect_short') {
    const defaults = STALL_DEFAULTS[stallType] || STALL_DEFAULTS.rect_short;
    const hallW = this.hallWidthFt();
    const hallH = this.hallHeightFt();

    const newTable = {
      _tempId: 'new_' + Date.now(),
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

    this.clampTableToBounds(newTable);
    this.tables.push(newTable);
    this.renderAllTables();
    this.selectTableObj(newTable);
    this.updateTableList();

    showToast(`Stall ${newTable.table_number} added — ${defaults.label}, ${Units.formatDims(defaults.width, defaults.height)}`, 'success');
  },

  rotateSelected() {
    if (!this.selectedTable) {
      showToast('Select a stall first', 'info');
      return;
    }

    this.selectedTable.rotation = ((this.selectedTable.rotation || 0) + 90) % 360;
    this.clampTableToBounds(this.selectedTable);
    this.renderAllTables();
    this.showProperties(this.selectedTable);
    this.updateTableList();

    showToast(`Stall ${this.selectedTable.table_number} rotated to ${this.selectedTable.rotation}°`, 'info');
  },

  deleteSelected() {
    if (!this.selectedTable) {
      showToast('Select a stall first', 'info');
      return;
    }

    if (this.selectedTable.status === 'booked') {
      showToast('Cannot delete a reserved stall. Cancel the booking first.', 'error');
      return;
    }

    const idx = this.tables.indexOf(this.selectedTable);
    if (idx > -1) {
      const num = this.selectedTable.table_number;
      this.tables.splice(idx, 1);
      this.selectedTable = null;
      this.renderAllTables();
      this.updateTableList();
      this.showEmptyProperties();
      showToast(`Stall ${num} removed`, 'success');
    }
  },

  duplicateSelected() {
    if (!this.selectedTable) {
      showToast('Select a stall first', 'info');
      return;
    }

    const copy = {
      ...this.selectedTable,
      id: undefined,
      _tempId: 'new_' + Date.now(),
      table_number: this.getNextAvailableTableNum(),
      x: this.selectedTable.x + 1,
      y: this.selectedTable.y + 1,
      status: 'available'
    };

    this.clampTableToBounds(copy);
    this.tables.push(copy);
    this.renderAllTables();
    this.selectTableObj(copy);
    this.updateTableList();

    showToast(`Duplicated as stall ${copy.table_number}`, 'success');
  },

  selectTableObj(table) {
    this.selectedTable = table;
    this.renderAllTables();
    this.showProperties(table);
    this.updateTableList();
  },

  showProperties(table) {
    const body = document.getElementById('properties-body');

    body.innerHTML = `
      <div class="form-group">
        <label class="form-label">Stall Number</label>
        <input type="text" class="form-input" value="${table.table_number}" onchange="layoutEditor.updateProp('table_number', this.value)" id="prop-number">
      </div>
      <div class="form-group">
        <label class="form-label">Label</label>
        <input type="text" class="form-input" value="${table.label || ''}" onchange="layoutEditor.updateProp('label', this.value)" id="prop-label">
      </div>
      <div class="form-group">
        <label class="form-label">Rotation (°)</label>
        <div style="display: flex; gap: var(--space-xs); align-items: center;">
          <input type="number" class="form-input" value="${table.rotation || 0}" step="90" onchange="layoutEditor.updateProp('rotation', (parseFloat(this.value)||0)%360)" id="prop-rotation">
          <button type="button" class="btn btn-secondary btn-sm" onclick="layoutEditor.rotateSelected()" title="Rotate +90°">+90°</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Size Category</label>
        <select class="form-select" onchange="layoutEditor.updateProp('size', this.value)" id="prop-size">
          <option value="small" ${table.size === 'small' ? 'selected' : ''}>Small</option>
          <option value="medium" ${table.size === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="large" ${table.size === 'large' ? 'selected' : ''}>Large</option>
        </select>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xs);">
        <div class="form-group">
          <label class="form-label">Width</label>
          <div class="input-with-unit">
            <input type="number" class="form-input" step="0.25" min="${Units.STALL_MIN_FT}" max="${Units.STALL_MAX_FT}" value="${table.width}" onchange="layoutEditor.updateProp('width', Units.clampStallFt(this.value, ${Units.DEFAULT_STALL_WIDTH_FT}))" id="prop-width">
            <span class="input-unit">ft</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Depth</label>
          <div class="input-with-unit">
            <input type="number" class="form-input" step="0.25" min="${Units.STALL_MIN_FT}" max="${Units.STALL_MAX_FT}" value="${table.height}" onchange="layoutEditor.updateProp('height', Units.clampStallFt(this.value, ${Units.DEFAULT_STALL_HEIGHT_FT}))" id="prop-height">
            <span class="input-unit">ft</span>
          </div>
        </div>
      </div>
      <p class="form-hint" style="margin-top: -6px; margin-bottom: var(--space-sm);">
        ${Units.formatDims(table.width, table.height)} &middot; ${Units.formatArea(table.width, table.height)}
      </p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xs);">
        <div class="form-group">
          <label class="form-label">X from left</label>
          <div class="input-with-unit">
            <input type="number" class="form-input" step="0.25" value="${Units.roundFt(table.x)}" onchange="layoutEditor.updateProp('x', Units.roundFt(Units.toFeet(this.value, 0)))" id="prop-x">
            <span class="input-unit">ft</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Y from top</label>
          <div class="input-with-unit">
            <input type="number" class="form-input" step="0.25" value="${Units.roundFt(table.y)}" onchange="layoutEditor.updateProp('y', Units.roundFt(Units.toFeet(this.value, 0)))" id="prop-y">
            <span class="input-unit">ft</span>
          </div>
        </div>
      </div>
      ${table.status === 'booked' ? '<p class="badge badge-booked" style="margin-top: 8px;">Reserved &ndash; Locked</p>' : ''}
    `;
  },

  showEmptyProperties() {
    document.getElementById('properties-body').innerHTML = `
      <p class="text-muted" style="font-size: 0.85rem; text-align: center; padding: var(--space-md) 0;">
        Select a stall on the floor plan to edit its properties.
      </p>
    `;
  },

  updateProp(prop, value) {
    if (!this.selectedTable) return;
    this.selectedTable[prop] = value;
    this.clampTableToBounds(this.selectedTable);
    this.renderAllTables();
    this.updateTableList();
    this.showProperties(this.selectedTable);
  },

  updateTableList() {
    const list = document.getElementById('table-list');
    const count = document.getElementById('table-count');
    count.textContent = this.tables.length;

    if (this.tables.length === 0) {
      list.innerHTML = '<p class="text-muted" style="font-size: 0.85rem; text-align: center;">No stalls placed yet</p>';
      return;
    }

    const sorted = [...this.tables].sort((a, b) => {
      const na = parseInt(a.table_number) || 0;
      const nb = parseInt(b.table_number) || 0;
      return na - nb;
    });

    const selectedId = this.selectedTable ? (this.selectedTable.id || this.selectedTable._tempId) : null;

    list.innerHTML = sorted.map(t => {
      const id = t.id || t._tempId;
      const isSelected = id === selectedId;
      const dims = `${Units.formatFeetShort(t.width)} × ${Units.formatFeetShort(t.height)}`;
      const rot = t.rotation ? ` · ${t.rotation}°` : '';
      const statusDot = t.status === 'booked'
        ? '<span style="width:6px;height:6px;border-radius:50%;background:var(--status-booked);display:inline-block;"></span>'
        : '';

      return `
        <div class="table-list-item ${isSelected ? 'selected' : ''}" onclick="layoutEditor.selectTableById('${id}')">
          <span>${statusDot} <strong>${t.table_number}</strong> &middot; ${t.label || t.shape}</span>
          <span style="color: var(--text-muted); font-size: 0.75rem;">${dims}${rot}</span>
        </div>
      `;
    }).join('');
  },

  selectTableById(id) {
    const table = this.tables.find(t => (t.id || t._tempId) == id);
    if (table) this.selectTableObj(table);
  },

  updateFloatingActionsPosition() {
    const floatingEl = document.getElementById('table-floating-actions');
    if (!floatingEl) return;

    if (!this.selectedTable) {
      floatingEl.classList.add('hidden');
      return;
    }

    try {
      const table = this.selectedTable;
      const cx = this.px(table.x + (table.width / 2));
      const topY = this.px(table.y) - 25;

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

      const rotDeg = table.rotation || 0;
      const rotateBtn = floatingEl.querySelector('button');
      if (rotateBtn) {
        rotateBtn.innerHTML = `Rotate (${rotDeg}°)`;
      }
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

  async saveLayout() {
    const saveBtn = document.getElementById('save-layout-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const payload = this.tables.map(t => ({
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

      const res = await fetch(`/api/admin/events/${this.eventId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables: payload })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save layout');
      }

      const result = await res.json();
      this.tables = result.tables;
      this.selectedTable = null;
      this.renderAllTables();
      this.updateTableList();
      this.showEmptyProperties();

      showToast('Floor plan saved', 'success');

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Floor Plan';
    }
  },

  bindEvents() {
    // Click / drag on SVG
    this.svg.addEventListener('mousedown', (e) => {
      // Rotate knob click
      if (e.target.dataset.rotateKnob || e.target.classList.contains('rotate-handle-knob')) {
        this.rotateSelected();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const group = e.target.closest('.table-group');

      if (group) {
        const id = group.dataset.tableId;
        const table = this.tables.find(t => (t.id || t._tempId) == id);
        if (!table) return;

        this.selectTableObj(table);

        if (table.status !== 'booked') {
          this.isDragging = true;
          this.dragTable = table;
          const pt = this.svgPointFt(e.clientX, e.clientY);
          this.dragOffset = { x: pt.x - table.x, y: pt.y - table.y };
        }

        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Clicked empty space — deselect
      this.selectedTable = null;
      this.renderAllTables();
      this.updateTableList();
      this.showEmptyProperties();
      this.clearGuides();

      // Start panning
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.dragTable) {
        const pt = this.svgPointFt(e.clientX, e.clientY);
        const rawX = pt.x - this.dragOffset.x;
        const rawY = pt.y - this.dragOffset.y;

        // Calculate precision snap & alignment guides
        const snapped = this.calculateSnapAndGuides(this.dragTable, rawX, rawY);

        this.dragTable.x = snapped.x;
        this.dragTable.y = snapped.y;
        this.clampTableToBounds(this.dragTable);

        this.renderAllTables();

        const propX = document.getElementById('prop-x');
        const propY = document.getElementById('prop-y');
        if (propX) propX.value = Units.roundFt(this.dragTable.x);
        if (propY) propY.value = Units.roundFt(this.dragTable.y);
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
        this.dragTable = null;
        this.clearGuides();
      }
      this.isPanning = false;
    });

    // Zoom centered on cursor
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

    // Blender Hotkeys: G (Grab), R (Rotate), Shift+D (Duplicate), X/Del (Delete), Esc (Cancel/Deselect)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'x' || e.key === 'X') {
        this.deleteSelected();
      } else if (e.key === 'd' || e.key === 'D') {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.duplicateSelected();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        this.rotateSelected();
      } else if (e.key === 'g' || e.key === 'G') {
        if (this.selectedTable) {
          showToast(`Grabbed Stall ${this.selectedTable.table_number}. Move mouse to reposition.`, 'info');
        }
      } else if (e.key === 'Escape') {
        this.selectedTable = null;
        this.renderAllTables();
        this.updateTableList();
        this.showEmptyProperties();
        this.clearGuides();
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

  /** Screen coordinates to hall coordinates, in feet. */
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
    this.viewBox = { ...this.originalViewBox };
    this.applyViewBox();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  layoutEditor.init();
});

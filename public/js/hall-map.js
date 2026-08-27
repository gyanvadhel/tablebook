/**
 * TableBook — Interactive Hall Map Engine
 * Reads shape directly from API data (no hardcoded orientation mapping)
 *
 * Hall and stall geometry arrives from the API in FEET. It is converted to
 * SVG drawing units only at the render boundary, via px().
 */

const HALL_PADDING_FT = 3;

const hallMap = {
  svg: null,
  container: null,
  tables: [],
  eventData: null,
  selectedTable: null,

  // Zoom & Pan
  viewBox: { x: 0, y: 0, w: 1200, h: 800 },
  originalViewBox: { x: 0, y: 0, w: 1200, h: 800 },
  isPanning: false,
  panStart: { x: 0, y: 0 },
  zoomLevel: 1,
  minZoom: 0.5,
  maxZoom: 3,

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

  async init() {
    this.svg = document.getElementById('hall-svg');
    this.container = document.getElementById('hall-map-container');

    if (!this.svg || !this.container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
      window.location.href = '/';
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) throw new Error('Event not found');

      const data = await response.json();
      this.eventData = data.event;
      this.tables = data.tables;

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

      this.populateEventHeader();
      this.setupViewBox();
      this.renderHall();
      this.renderElements();
      this.renderTables();
      this.updateCounts();
      this.bindEvents();

    } catch (err) {
      console.error('Failed to load event:', err);
      document.getElementById('event-title').textContent = 'Event Not Found';
    }
  },

  populateEventHeader() {
    const event = this.eventData;
    document.getElementById('event-title').textContent = event.name;
    document.title = `${event.name} — TableBook`;

    const startDate = event.start_date ? new Date(event.start_date) : null;
    const endDate = event.end_date ? new Date(event.end_date) : null;

    let dateStr = 'Date TBD';
    if (startDate && endDate) {
      dateStr = `${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} &ndash; ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else if (startDate) {
      dateStr = startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    document.getElementById('event-date').innerHTML = dateStr;
    document.getElementById('event-venue').innerHTML = this.escapeHtml(event.venue || 'Venue TBD');

    const available = this.tables.filter(t => t.status === 'available').length;
    document.getElementById('event-tables-count').innerHTML = `${available} available stalls`;

    const hallSizeEl = document.getElementById('event-hall-size');
    if (hallSizeEl) {
      hallSizeEl.innerHTML = `${Units.formatDims(this.hallWidthFt(), this.hallHeightFt())} hall`;
    }

    if (event.description) {
      document.getElementById('event-description').textContent = event.description;
    }
  },

  setupViewBox() {
    const hallW = this.hallWidthFt();
    const hallH = this.hallHeightFt();

    // Include bounds of elements placed outside the hall
    let minXFt = 0;
    let minYFt = 0;
    let maxXFt = hallW;
    let maxYFt = hallH;

    if (this.elements && this.elements.length) {
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
    }

    const padding = this.px(8);
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
  },

  renderHall() {
    const widthFt = this.hallWidthFt();
    const heightFt = this.hallHeightFt();
    const w = this.px(widthFt);
    const h = this.px(heightFt);
    const wallThick = this.px(0.8);
    const ns = 'http://www.w3.org/2000/svg';

    this.svg.innerHTML = '';

    const defs = document.createElementNS(ns, 'defs');

    // Canvas subtle grid pattern
    const minor = this.px(1);
    const major = this.px(5);
    const gridPattern = document.createElementNS(ns, 'pattern');
    gridPattern.setAttribute('id', 'public-bg-grid');
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
    woodFloorPattern.setAttribute('id', 'wood-floor-texture-public');
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
    tableWood.setAttribute('id', 'honey-oak-table-public');
    tableWood.setAttribute('width', this.px(4));
    tableWood.setAttribute('height', this.px(2));
    tableWood.setAttribute('patternUnits', 'userSpaceOnUse');
    tableWood.innerHTML = `
      <rect width="${this.px(4)}" height="${this.px(2)}" fill="#c98a46"/>
      <line x1="0" y1="${this.px(1)}" x2="${this.px(4)}" y2="${this.px(1)}" stroke="#b87733" stroke-width="0.8" stroke-dasharray="8 2"/>
    `;
    defs.appendChild(tableWood);

    // Crimson Red Table Pattern (Booked / Reserved)
    const tableBooked = document.createElementNS(ns, 'pattern');
    tableBooked.setAttribute('id', 'booked-table-public');
    tableBooked.setAttribute('width', this.px(4));
    tableBooked.setAttribute('height', this.px(2));
    tableBooked.setAttribute('patternUnits', 'userSpaceOnUse');
    tableBooked.innerHTML = `
      <rect width="${this.px(4)}" height="${this.px(2)}" fill="#e11d48"/>
      <line x1="0" y1="${this.px(1)}" x2="${this.px(4)}" y2="${this.px(1)}" stroke="#be123c" stroke-width="0.8" stroke-dasharray="8 2"/>
    `;
    defs.appendChild(tableBooked);

    this.svg.appendChild(defs);

    // Background Canvas
    const bgCanvas = document.createElementNS(ns, 'rect');
    bgCanvas.setAttribute('x', -this.px(20)); bgCanvas.setAttribute('y', -this.px(20));
    bgCanvas.setAttribute('width', w + this.px(40)); bgCanvas.setAttribute('height', h + this.px(40));
    bgCanvas.setAttribute('fill', 'url(#public-bg-grid)');
    this.svg.appendChild(bgCanvas);

    // Architectural Perimeter Wall
    const wallOuter = document.createElementNS(ns, 'rect');
    wallOuter.setAttribute('x', -wallThick); wallOuter.setAttribute('y', -wallThick);
    wallOuter.setAttribute('width', w + wallThick * 2); wallOuter.setAttribute('height', h + wallThick * 2);
    wallOuter.setAttribute('fill', '#475569'); wallOuter.setAttribute('stroke', '#1e293b'); wallOuter.setAttribute('stroke-width', '1.5');
    wallOuter.setAttribute('rx', '2');
    this.svg.appendChild(wallOuter);

    // Hardwood Floor Plan
    const floor = document.createElementNS(ns, 'rect');
    floor.setAttribute('x', '0'); floor.setAttribute('y', '0');
    floor.setAttribute('width', w); floor.setAttribute('height', h);
    floor.setAttribute('fill', 'url(#wood-floor-texture-public)');
    floor.setAttribute('stroke', '#1e293b'); floor.setAttribute('stroke-width', '1.5');
    this.svg.appendChild(floor);

    // Room name & Area badge (only render static if no room_badge element is placed)
    const hasCustomRoomBadge = this.elements && this.elements.some(el => el.type === 'room_badge');
    if (!hasCustomRoomBadge) {
      const areaFt = Math.round(widthFt * heightFt);
      const roomInfoG = document.createElementNS(ns, 'g');
      roomInfoG.setAttribute('transform', 'translate(10, 18)');
      roomInfoG.setAttribute('pointer-events', 'none');

      const roomTitle = document.createElementNS(ns, 'text');
      roomTitle.setAttribute('x', '0'); roomTitle.setAttribute('y', '0');
      roomTitle.setAttribute('fill', '#334155'); roomTitle.setAttribute('font-size', '11');
      roomTitle.setAttribute('font-weight', '700'); roomTitle.setAttribute('font-family', 'Inter, sans-serif');
      roomTitle.textContent = this.eventData.name || 'Main Hall';
      roomInfoG.appendChild(roomTitle);

      const roomArea = document.createElementNS(ns, 'text');
      roomArea.setAttribute('x', '0'); roomArea.setAttribute('y', '13');
      roomArea.setAttribute('fill', '#475569'); roomArea.setAttribute('font-size', '9.5');
      roomArea.setAttribute('font-weight', '600'); roomArea.setAttribute('font-family', 'Inter, sans-serif');
      roomArea.textContent = `${areaFt.toLocaleString('en-IN')} sq ft`;
      roomInfoG.appendChild(roomArea);
      this.svg.appendChild(roomInfoG);
    }

    this.renderDimensionLabels(widthFt, heightFt, ns);
    this.renderScaleBar(widthFt, heightFt, ns);
  },

  /** Overall hall width and depth, printed along the outside edges. */
  renderDimensionLabels(widthFt, heightFt, ns) {
    const w = this.px(widthFt);
    const h = this.px(heightFt);

    const labelW = document.createElementNS(ns, 'text');
    labelW.setAttribute('x', w / 2);
    labelW.setAttribute('y', -10);
    labelW.setAttribute('text-anchor', 'middle');
    labelW.setAttribute('class', 'hall-dimension-label');
    labelW.textContent = Units.formatFeet(widthFt);
    this.svg.appendChild(labelW);

    const labelH = document.createElementNS(ns, 'text');
    labelH.setAttribute('x', -12);
    labelH.setAttribute('y', h / 2);
    labelH.setAttribute('text-anchor', 'middle');
    labelH.setAttribute('class', 'hall-dimension-label');
    labelH.setAttribute('transform', `rotate(-90, -12, ${h / 2})`);
    labelH.textContent = Units.formatFeet(heightFt);
    this.svg.appendChild(labelH);
  },

  /** A 10 ft rule under the plan, so distances stay legible at any zoom. */
  renderScaleBar(widthFt, heightFt, ns) {
    const barFt = 10;
    const barLength = this.px(barFt);
    const y = this.px(heightFt) + 16;
    const group = document.createElementNS(ns, 'g');
    group.setAttribute('class', 'hall-scale-bar');

    const rule = document.createElementNS(ns, 'path');
    rule.setAttribute('d', `M 0 ${y - 4} V ${y} H ${barLength} V ${y - 4}`);
    rule.setAttribute('fill', 'none');
    group.appendChild(rule);

    const caption = document.createElementNS(ns, 'text');
    caption.setAttribute('x', barLength + 6);
    caption.setAttribute('y', y + 1);
    caption.textContent = `${barFt} ft`;
    group.appendChild(caption);

    this.svg.appendChild(group);
  },

  renderTables() {
    const ns = 'http://www.w3.org/2000/svg';
    const tablesGroup = document.createElementNS(ns, 'g');
    tablesGroup.setAttribute('id', 'tables-layer');

    this.tables.forEach(table => {
      const isBooked = table.status === 'booked';
      const isSelected = this.selectedTable && this.selectedTable.id === table.id;
      const effectiveStatus = isSelected ? 'selected' : (isBooked ? 'booked' : 'available');

      const group = document.createElementNS(ns, 'g');
      group.setAttribute('class', `table-group table-${effectiveStatus}`);
      group.setAttribute('data-table-id', table.id);
      group.setAttribute('data-table-number', table.table_number);

      if (table.rotation) {
        const cx = this.px(table.x + (table.width / 2));
        const cy = this.px(table.y + (table.height / 2));
        group.setAttribute('transform', `rotate(${table.rotation}, ${cx}, ${cy})`);
      }

      const shapeInfo = this.renderStallShape(table, ns, effectiveStatus);
      group.appendChild(shapeInfo.el);

      // Table number label (white for booked/selected, dark for available)
      const numY = isBooked ? shapeInfo.textY - 3 : shapeInfo.textY - 5;
      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', shapeInfo.textX);
      label.setAttribute('y', numY);
      label.setAttribute('class', 'table-number');
      label.setAttribute('fill', isBooked || isSelected ? '#ffffff' : '#1e293b');
      label.setAttribute('font-weight', '700');
      label.textContent = table.table_number;

      if (table.rotation) {
        label.setAttribute('transform', `rotate(${-table.rotation}, ${shapeInfo.textX}, ${numY})`);
      }
      group.appendChild(label);

      // Sub-label (BOOKED for reserved tables, dimensions for available)
      const dimY = isBooked ? shapeInfo.textY + 6 : shapeInfo.textY + 8;
      const dimLabel = document.createElementNS(ns, 'text');
      dimLabel.setAttribute('x', shapeInfo.textX);
      dimLabel.setAttribute('y', dimY);
      dimLabel.setAttribute('class', 'table-dimensions');
      dimLabel.setAttribute('font-size', isBooked ? '7.5' : '8.5');
      dimLabel.setAttribute('font-weight', '700');
      dimLabel.setAttribute('letter-spacing', isBooked ? '0.04em' : 'normal');
      dimLabel.setAttribute('text-anchor', 'middle');
      dimLabel.setAttribute('dominant-baseline', 'central');
      dimLabel.setAttribute('fill', isBooked ? '#ffe4e6' : (isSelected ? '#dbeafe' : '#475569'));
      dimLabel.setAttribute('font-family', 'Inter, sans-serif');
      dimLabel.setAttribute('pointer-events', 'none');
      dimLabel.textContent = isBooked ? 'BOOKED' : `${Units.formatFeetShort(table.width)} × ${Units.formatFeetShort(table.height)}`;

      if (table.rotation) {
        dimLabel.setAttribute('transform', `rotate(${-table.rotation}, ${shapeInfo.textX}, ${dimY})`);
      }
      group.appendChild(dimLabel);

      tablesGroup.appendChild(group);
    });

    this.svg.appendChild(tablesGroup);
  },

  renderElements() {
    if (!this.elements || !this.elements.length) return;
    const ns = 'http://www.w3.org/2000/svg';
    const elementsGroup = document.createElementNS(ns, 'g');
    elementsGroup.setAttribute('id', 'hall-elements-layer');

    this.elements.forEach(elem => {
      if (elem.type === 'door') {
        this.renderDoorElement(elem, elementsGroup, ns);
      } else if (elem.type === 'text') {
        this.renderTextElement(elem, elementsGroup, ns);
      } else if (elem.type === 'room_badge') {
        this.renderRoomBadgeElement(elem, elementsGroup, ns);
      } else {
        this.renderStructureElement(elem, elementsGroup, ns);
      }
    });

    this.svg.appendChild(elementsGroup);
  },

  renderRoomBadgeElement(badge, layer, ns) {
    const group = document.createElementNS(ns, 'g');
    const elemId = String(badge.id || 'room_badge_main');
    group.setAttribute('class', 'arch-element arch-room-badge');

    const cx = this.px(badge.x + (badge.width || 8) / 2);
    const cy = this.px(badge.y + (badge.height || 3) / 2);

    if (badge.rotation) {
      group.setAttribute('transform', `rotate(${badge.rotation}, ${cx}, ${cy})`);
    }

    const x = this.px(badge.x);
    const y = this.px(badge.y);
    const titleText = badge.label || this.eventData.name || 'Unnamed';
    const areaFt = Math.round(this.hallWidthFt() * this.hallHeightFt());

    const titleEl = document.createElementNS(ns, 'text');
    titleEl.setAttribute('x', x);
    titleEl.setAttribute('y', y + 10);
    titleEl.setAttribute('fill', '#1e293b');
    titleEl.setAttribute('font-size', '11');
    titleEl.setAttribute('font-weight', '700');
    titleEl.setAttribute('font-family', 'Inter, -apple-system, sans-serif');
    titleEl.textContent = titleText;
    group.appendChild(titleEl);

    const areaEl = document.createElementNS(ns, 'text');
    areaEl.setAttribute('x', x);
    areaEl.setAttribute('y', y + 24);
    areaEl.setAttribute('fill', '#64748b');
    areaEl.setAttribute('font-size', '9.5');
    areaEl.setAttribute('font-weight', '600');
    areaEl.setAttribute('font-family', 'Inter, -apple-system, sans-serif');
    areaEl.textContent = `${areaFt.toLocaleString('en-IN')} sq ft`;
    group.appendChild(areaEl);

    layer.appendChild(group);
  },

  renderDoorElement(door, layer, ns) {
    const group = document.createElementNS(ns, 'g');
    group.setAttribute('class', `arch-element arch-door arch-door-${door.doorType || 'entrance'}`);

    const w = this.px(door.width || 4);
    const h = this.px(door.height || 2);
    const cx = this.px(door.x + (door.width || 4) / 2);
    const cy = this.px(door.y + (door.height || 2) / 2);

    if (door.rotation) {
      group.setAttribute('transform', `rotate(${door.rotation}, ${cx}, ${cy})`);
    }

    const x = this.px(door.x);
    const y = this.px(door.y);

    if (door.doorType === 'double') {
      const halfW = w / 2;
      const arcPath = `M ${x} ${y} A ${halfW} ${halfW} 0 0 1 ${x + halfW} ${y + halfW} L ${x + halfW} ${y} M ${x + w} ${y} A ${halfW} ${halfW} 0 0 0 ${x + halfW} ${y + halfW} L ${x + halfW} ${y}`;
      const arc = document.createElementNS(ns, 'path');
      arc.setAttribute('d', arcPath);
      arc.setAttribute('fill', 'rgba(37, 99, 235, 0.08)');
      arc.setAttribute('stroke', '#2563eb');
      arc.setAttribute('stroke-dasharray', '3 2');
      group.appendChild(arc);

      const frame = document.createElementNS(ns, 'rect');
      frame.setAttribute('x', x); frame.setAttribute('y', y - 3);
      frame.setAttribute('width', w); frame.setAttribute('height', 6);
      frame.setAttribute('fill', '#1e293b'); frame.setAttribute('rx', '2');
      group.appendChild(frame);
    } else if (door.doorType === 'gate') {
      const frame = document.createElementNS(ns, 'rect');
      frame.setAttribute('x', x); frame.setAttribute('y', y);
      frame.setAttribute('width', w); frame.setAttribute('height', Math.max(h, 8));
      frame.setAttribute('fill', '#f8fafc'); frame.setAttribute('stroke', '#64748b'); frame.setAttribute('stroke-width', '1.5');
      group.appendChild(frame);
    } else {
      const swingR = w;
      const isExit = door.doorType === 'exit';
      const color = isExit ? '#dc2626' : '#059669';

      const arc = document.createElementNS(ns, 'path');
      arc.setAttribute('d', `M ${x} ${y} A ${swingR} ${swingR} 0 0 1 ${x + swingR} ${y + swingR} L ${x} ${y + swingR} Z`);
      arc.setAttribute('fill', isExit ? 'rgba(220, 38, 38, 0.1)' : 'rgba(5, 150, 105, 0.1)');
      arc.setAttribute('stroke', color);
      arc.setAttribute('stroke-width', '1.2');
      arc.setAttribute('stroke-dasharray', '3 2');
      group.appendChild(arc);

      const leaf = document.createElementNS(ns, 'line');
      leaf.setAttribute('x1', x); leaf.setAttribute('y1', y);
      leaf.setAttribute('x2', x); leaf.setAttribute('y2', y + swingR);
      leaf.setAttribute('stroke', color); leaf.setAttribute('stroke-width', '2.5');
      group.appendChild(leaf);

      const threshold = document.createElementNS(ns, 'line');
      threshold.setAttribute('x1', x); threshold.setAttribute('y1', y);
      threshold.setAttribute('x2', x + w); threshold.setAttribute('y2', y);
      threshold.setAttribute('stroke', '#0f172a'); threshold.setAttribute('stroke-width', '3');
      group.appendChild(threshold);
    }

    const badgeG = document.createElementNS(ns, 'g');
    badgeG.setAttribute('transform', `translate(${cx}, ${cy})`);

    const labelText = door.label || (door.doorType === 'exit' ? 'EMERGENCY EXIT' : 'MAIN ENTRANCE');
    const badgeRect = document.createElementNS(ns, 'rect');
    const textWidth = Math.max(labelText.length * 6.5 + 16, 50);
    badgeRect.setAttribute('x', -textWidth / 2); badgeRect.setAttribute('y', -10);
    badgeRect.setAttribute('width', textWidth); badgeRect.setAttribute('height', 20);
    badgeRect.setAttribute('rx', '10');
    badgeRect.setAttribute('fill', door.doorType === 'exit' ? '#fee2e2' : '#dcfce7');
    badgeRect.setAttribute('stroke', door.doorType === 'exit' ? '#ef4444' : '#10b981');
    badgeRect.setAttribute('stroke-width', '1');
    badgeG.appendChild(badgeRect);

    const txt = document.createElementNS(ns, 'text');
    txt.setAttribute('x', 0); txt.setAttribute('y', 3);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('fill', door.doorType === 'exit' ? '#991b1b' : '#065f46');
    txt.setAttribute('font-size', '9');
    txt.setAttribute('font-weight', '700');
    txt.setAttribute('font-family', 'Inter, sans-serif');
    txt.textContent = labelText;
    badgeG.appendChild(txt);

    if (door.rotation) {
      badgeG.setAttribute('transform', `translate(${cx}, ${cy}) rotate(${-door.rotation})`);
    }
    group.appendChild(badgeG);

    layer.appendChild(group);
  },

  renderTextElement(elem, layer, ns) {
    const group = document.createElementNS(ns, 'g');
    group.setAttribute('class', 'arch-element arch-text-element');

    const cx = this.px(elem.x + (elem.width || 4) / 2);
    const cy = this.px(elem.y + (elem.height || 2) / 2);

    if (elem.rotation) {
      group.setAttribute('transform', `rotate(${elem.rotation}, ${cx}, ${cy})`);
    }

    const textStr = elem.text || elem.label || 'LABEL';
    const fontSize = elem.fontSize || 14;
    const color = elem.color || '#0f172a';
    const isBold = elem.fontWeight === 'bold' || elem.fontWeight === '700' || elem.fontWeight === '800';

    if (elem.badge) {
      const paddingX = 14;
      const textLength = textStr.length * (fontSize * 0.58) + paddingX * 2;
      const badgeH = fontSize + 14;

      const badge = document.createElementNS(ns, 'rect');
      badge.setAttribute('x', cx - textLength / 2);
      badge.setAttribute('y', cy - badgeH / 2);
      badge.setAttribute('width', textLength);
      badge.setAttribute('height', badgeH);
      badge.setAttribute('rx', badgeH / 2);
      badge.setAttribute('fill', '#ffffff');
      badge.setAttribute('stroke', color);
      badge.setAttribute('stroke-width', '1.5');
      badge.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))');
      group.appendChild(badge);
    }

    const textEl = document.createElementNS(ns, 'text');
    textEl.setAttribute('x', cx);
    textEl.setAttribute('y', cy + (fontSize * 0.35));
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('fill', color);
    textEl.setAttribute('font-size', `${fontSize}`);
    textEl.setAttribute('font-weight', isBold ? '700' : '500');
    textEl.setAttribute('font-family', 'Inter, -apple-system, sans-serif');
    textEl.setAttribute('letter-spacing', '0.04em');
    textEl.textContent = textStr;
    group.appendChild(textEl);

    layer.appendChild(group);
  },

  renderStructureElement(elem, layer, ns) {
    const group = document.createElementNS(ns, 'g');
    group.setAttribute('class', `arch-element arch-structure arch-${elem.type}`);

    const w = this.px(elem.width || 2);
    const h = this.px(elem.height || 2);
    const x = this.px(elem.x);
    const y = this.px(elem.y);
    const cx = x + w / 2;
    const cy = y + h / 2;

    if (elem.rotation) {
      group.setAttribute('transform', `rotate(${elem.rotation}, ${cx}, ${cy})`);
    }

    if (elem.type === 'pillar_round') {
      const r = Math.min(w, h) / 2;
      const col = document.createElementNS(ns, 'circle');
      col.setAttribute('cx', cx); col.setAttribute('cy', cy); col.setAttribute('r', r);
      col.setAttribute('fill', '#cbd5e1'); col.setAttribute('stroke', '#475569'); col.setAttribute('stroke-width', '2');
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
      stageLabel.setAttribute('letter-spacing', '0.08em');
      stageLabel.textContent = (elem.label || 'MAIN STAGE').toUpperCase();
      group.appendChild(stageLabel);
    } else if (elem.type === 'arrow') {
      const arrowPath = `M ${x} ${cy - 4} H ${x + w - 12} V ${cy - 10} L ${x + w} ${cy} L ${x + w - 12} ${cy + 10} V ${cy + 4} H ${x} Z`;
      const arrow = document.createElementNS(ns, 'path');
      arrow.setAttribute('d', arrowPath);
      arrow.setAttribute('fill', '#3b82f6'); arrow.setAttribute('stroke', '#1d4ed8'); arrow.setAttribute('stroke-width', '1');
      group.appendChild(arrow);
    } else {
      const pillar = document.createElementNS(ns, 'rect');
      pillar.setAttribute('x', x); pillar.setAttribute('y', y);
      pillar.setAttribute('width', w); pillar.setAttribute('height', h);
      pillar.setAttribute('fill', '#cbd5e1'); pillar.setAttribute('stroke', '#475569'); pillar.setAttribute('stroke-width', '2');
      pillar.setAttribute('rx', '2');
      group.appendChild(pillar);
    }

    layer.appendChild(group);
  },

  renderStallShape(table, ns, status = 'available') {
    const shape = table.shape || 'rect';
    const x = this.px(table.x);
    const y = this.px(table.y);
    const w = this.px(table.width || Units.DEFAULT_STALL_WIDTH_FT);
    const h = this.px(table.height || Units.DEFAULT_STALL_HEIGHT_FT);

    const container = document.createElementNS(ns, 'g');
    container.setAttribute('class', 'table-shape-container');

    if (shape === 'Pod' || (table.width >= 7.5 && table.height >= 3.5)) {
      const halfW = w / 2;
      const halfH = h / 2;
      const t1 = this.createTableUnitRect(x, y, halfW, halfH, ns, status);
      const t2 = this.createTableUnitRect(x + halfW, y, halfW, halfH, ns, status);
      const t3 = this.createTableUnitRect(x, y + halfH, halfW, halfH, ns, status);
      const t4 = this.createTableUnitRect(x + halfW, y + halfH, halfW, halfH, ns, status);
      container.appendChild(t1); container.appendChild(t2);
      container.appendChild(t3); container.appendChild(t4);
      return { el: container, textX: x + w / 2, textY: y + h / 2 };
    }

    if (shape === 'T-Stall') {
      const halfW = w / 3;
      const topT = this.createTableUnitRect(x, y, w, h / 2, ns, status);
      const stemT = this.createTableUnitRect(x + halfW, y + h / 2, halfW, h / 2, ns, status);
      container.appendChild(topT);
      container.appendChild(stemT);
      return { el: container, textX: x + w / 2, textY: y + h / 2 };
    }

    if (shape === 'L-Stall-Inverted' || shape === 'L-Inverted' || shape === 'L-Mirrored') {
      const armW = this.px(2);
      const armH = this.px(2);
      const topT = this.createTableUnitRect(x, y, w, armH, ns, status);
      const sideT = this.createTableUnitRect(x + w - armW, y + armH, armW, h - armH, ns, status);
      container.appendChild(topT);
      container.appendChild(sideT);
      return { el: container, textX: x + w / 2, textY: y + h / 2 };
    }

    if (shape === 'L-Stall' || shape.startsWith('L')) {
      const armW = this.px(2);
      const armH = this.px(2);
      const topT = this.createTableUnitRect(x, y, w, armH, ns, status);
      const sideT = this.createTableUnitRect(x, y + armH, armW, h - armH, ns, status);
      container.appendChild(topT);
      container.appendChild(sideT);
      return { el: container, textX: x + w / 2, textY: y + h / 2 };
    }

    if (table.width >= 7.5 && table.height <= 3) {
      const halfW = w / 2;
      const t1 = this.createTableUnitRect(x, y, halfW, h, ns, status);
      const t2 = this.createTableUnitRect(x + halfW, y, halfW, h, ns, status);
      container.appendChild(t1);
      container.appendChild(t2);
      return { el: container, textX: x + w / 2, textY: y + h / 2 };
    }

    const tRect = this.createTableUnitRect(x, y, w, h, ns, status);
    container.appendChild(tRect);
    return { el: container, textX: x + w / 2, textY: y + h / 2 };
  },

  createTableUnitRect(x, y, w, h, ns, status = 'available') {
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', x); rect.setAttribute('y', y);
    rect.setAttribute('width', w); rect.setAttribute('height', h);

    if (status === 'booked') {
      rect.setAttribute('fill', 'url(#booked-table-public)');
      rect.setAttribute('stroke', '#9f1239');
      rect.setAttribute('stroke-width', '1.5');
    } else if (status === 'selected') {
      rect.setAttribute('fill', '#2563eb');
      rect.setAttribute('stroke', '#1d4ed8');
      rect.setAttribute('stroke-width', '2');
    } else {
      rect.setAttribute('fill', 'url(#honey-oak-table-public)');
      rect.setAttribute('stroke', '#8c5822');
      rect.setAttribute('stroke-width', '1');
    }

    rect.setAttribute('rx', '2'); rect.setAttribute('ry', '2');
    return rect;
  },

  updateCounts() {
    const available = this.tables.filter(t => t.status === 'available').length;
    const booked = this.tables.filter(t => t.status === 'booked').length;
    document.getElementById('available-count').textContent = `${available} Available`;
    document.getElementById('booked-count').textContent = `${booked} Booked`;
  },

  bindEvents() {
    // Table click
    this.svg.addEventListener('click', (e) => {
      const group = e.target.closest('.table-group');
      if (!group) return;

      const tableId = group.dataset.tableId;
      const table = this.tables.find(t => String(t.id) === String(tableId));

      if (!table || table.status === 'booked' || table.status === 'blocked') return;

      this.selectTable(table, group);
    });

    // Tooltip
    const tooltip = document.getElementById('map-tooltip');
    const tooltipTitle = document.getElementById('tooltip-title');
    const tooltipDetail = document.getElementById('tooltip-detail');

    this.container.addEventListener('mousemove', (e) => {
      const group = e.target.closest('.table-group');
      if (!group) {
        tooltip.classList.remove('visible');
        return;
      }

      const tableId = group.dataset.tableId;
      const table = this.tables.find(t => String(t.id) === String(tableId));
      if (!table) return;

      if (table.status === 'booked') {
        tooltipTitle.textContent = `Stall ${table.table_number}`;
        tooltipDetail.innerHTML = '<span style="color: var(--status-booked); font-weight: 700;">Reserved</span>';
      } else if (table.status === 'blocked') {
        tooltipTitle.textContent = `Stall ${table.table_number}`;
        tooltipDetail.innerHTML = '<span style="color: var(--text-muted);">Unavailable</span>';
      } else {
        const dims = Units.formatDims(table.width, table.height);
        const priceVal = parseFloat(table.price) || 0;
        const priceStr = priceVal > 0 ? ` &middot; <strong>₹${priceVal.toLocaleString('en-IN')}</strong>` : '';
        tooltipTitle.textContent = `Stall ${table.table_number} — ${dims}`;
        tooltipDetail.innerHTML = `${table.label || 'Stall'}${priceStr} &middot; Click to book`;
      }

      const rect = this.container.getBoundingClientRect();
      tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
      tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
      tooltip.classList.add('visible');
    });

    this.container.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });

    // Pan
    this.container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.table-group') || e.target.closest('.map-controls')) return;
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      const dx = (e.clientX - this.panStart.x) * (this.viewBox.w / this.container.clientWidth);
      const dy = (e.clientY - this.panStart.y) * (this.viewBox.h / this.container.clientHeight);
      this.viewBox.x -= dx;
      this.viewBox.y -= dy;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.applyViewBox();
    });

    window.addEventListener('mouseup', () => {
      this.isPanning = false;
    });

    // Zoom
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      this.zoom(factor, e.clientX, e.clientY);
    }, { passive: false });

    // Modal close
    document.getElementById('modal-close-btn').addEventListener('click', () => this.closeBookingModal());
    document.getElementById('modal-cancel-btn').addEventListener('click', () => this.closeBookingModal());
    document.getElementById('booking-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeBookingModal();
    });
  },

  zoom(factor, clientX, clientY) {
    const rect = this.container.getBoundingClientRect();
    const mouseX = this.viewBox.x + (clientX - rect.left) / rect.width * this.viewBox.w;
    const mouseY = this.viewBox.y + (clientY - rect.top) / rect.height * this.viewBox.h;

    const newW = this.viewBox.w * factor;
    const newH = this.viewBox.h * factor;
    const newZoom = this.originalViewBox.w / newW;
    if (newZoom < this.minZoom || newZoom > this.maxZoom) return;

    this.viewBox.x = mouseX - (mouseX - this.viewBox.x) * (newW / this.viewBox.w);
    this.viewBox.y = mouseY - (mouseY - this.viewBox.y) * (newH / this.viewBox.h);
    this.viewBox.w = newW;
    this.viewBox.h = newH;
    this.zoomLevel = newZoom;

    this.applyViewBox();
  },

  zoomIn() {
    const rect = this.container.getBoundingClientRect();
    this.zoom(0.8, rect.left + rect.width / 2, rect.top + rect.height / 2);
  },

  zoomOut() {
    const rect = this.container.getBoundingClientRect();
    this.zoom(1.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
  },

  resetView() {
    this.viewBox = { ...this.originalViewBox };
    this.zoomLevel = 1;
    this.applyViewBox();
  },

  selectTable(table, groupElement) {
    // Deselect previous
    if (this.selectedTable) {
      const prevGroup = this.svg.querySelector(`[data-table-id="${this.selectedTable.id}"]`);
      if (prevGroup) {
        prevGroup.classList.remove('table-selected');
        prevGroup.classList.add('table-available');
      }
    }

    this.selectedTable = table;
    groupElement.classList.remove('table-available');
    groupElement.classList.add('table-selected');

    this.openBookingModal(table);
  },

  openBookingModal(table) {
    document.getElementById('modal-table-number').textContent = table.table_number;
    document.getElementById('modal-table-label').textContent = table.label || '';
    document.getElementById('detail-number').textContent = table.table_number;
    document.getElementById('detail-label').textContent = table.label || 'Stall';
    const sizeName = table.size ? (table.size.charAt(0).toUpperCase() + table.size.slice(1)) : 'Standard';
    document.getElementById('detail-size').textContent = sizeName;
    document.getElementById('detail-footprint').textContent = Units.formatDims(table.width, table.height);
    document.getElementById('detail-area').textContent = Units.formatArea(table.width, table.height);

    const priceVal = parseFloat(table.price) || 0;
    const priceEl = document.getElementById('detail-price');
    if (priceEl) {
      priceEl.textContent = priceVal > 0 ? `₹${priceVal.toLocaleString('en-IN')}` : '₹0 (Complimentary / Free)';
    }

    document.getElementById('booking-table-id').value = table.id;
    document.getElementById('booking-event-id').value = this.eventData.id;

    document.getElementById('booking-modal-overlay').classList.add('active');

    setTimeout(() => document.getElementById('customer-name').focus(), 200);
  },

  closeBookingModal() {
    document.getElementById('booking-modal-overlay').classList.remove('active');

    if (this.selectedTable) {
      const group = this.svg.querySelector(`[data-table-id="${this.selectedTable.id}"]`);
      if (group) {
        group.classList.remove('table-selected');
        group.classList.add('table-available');
      }
      this.selectedTable = null;
    }

    document.getElementById('booking-form').reset();
    document.getElementById('form-error').classList.add('hidden');
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  hallMap.init();
});

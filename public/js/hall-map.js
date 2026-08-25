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

      this.populateEventHeader();
      this.setupViewBox();
      this.renderHall();
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
    const w = this.px(this.hallWidthFt());
    const h = this.px(this.hallHeightFt());
    const padding = this.px(HALL_PADDING_FT);

    this.viewBox = { x: -padding, y: -padding, w: w + padding * 2, h: h + padding * 2 };
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
    const ns = 'http://www.w3.org/2000/svg';

    // Grid squares are a real 5 ft, so the plan reads at true scale
    const gridFt = 5;
    const grid = this.px(gridFt);

    const defs = document.createElementNS(ns, 'defs');
    const pattern = document.createElementNS(ns, 'pattern');
    pattern.setAttribute('id', 'hall-grid');
    pattern.setAttribute('width', grid);
    pattern.setAttribute('height', grid);
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');

    const gridLine1 = document.createElementNS(ns, 'line');
    gridLine1.setAttribute('x1', grid); gridLine1.setAttribute('y1', '0');
    gridLine1.setAttribute('x2', grid); gridLine1.setAttribute('y2', grid);
    gridLine1.setAttribute('class', 'hall-grid-line');
    const gridLine2 = document.createElementNS(ns, 'line');
    gridLine2.setAttribute('x1', '0'); gridLine2.setAttribute('y1', grid);
    gridLine2.setAttribute('x2', grid); gridLine2.setAttribute('y2', grid);
    gridLine2.setAttribute('class', 'hall-grid-line');
    pattern.appendChild(gridLine1);
    pattern.appendChild(gridLine2);
    defs.appendChild(pattern);
    this.svg.appendChild(defs);

    // Floor
    const floor = document.createElementNS(ns, 'rect');
    floor.setAttribute('x', '0'); floor.setAttribute('y', '0');
    floor.setAttribute('width', w); floor.setAttribute('height', h);
    floor.setAttribute('fill', 'url(#hall-grid)'); floor.setAttribute('rx', '4');
    this.svg.appendChild(floor);

    // Hall boundary
    const boundary = document.createElementNS(ns, 'rect');
    boundary.setAttribute('x', '0'); boundary.setAttribute('y', '0');
    boundary.setAttribute('width', w); boundary.setAttribute('height', h);
    boundary.setAttribute('class', 'hall-boundary'); boundary.setAttribute('rx', '4');
    this.svg.appendChild(boundary);

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
      const group = document.createElementNS(ns, 'g');
      group.setAttribute('class', `table-group table-${table.status}`);
      group.setAttribute('data-table-id', table.id);
      group.setAttribute('data-table-number', table.table_number);

      if (table.rotation) {
        const cx = this.px(table.x + (table.width / 2));
        const cy = this.px(table.y + (table.height / 2));
        group.setAttribute('transform', `rotate(${table.rotation}, ${cx}, ${cy})`);
      }

      const shapeInfo = this.renderStallShape(table, ns);
      group.appendChild(shapeInfo.el);

      // Table number label
      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', shapeInfo.textX);
      label.setAttribute('y', shapeInfo.textY);
      label.setAttribute('class', 'table-number');
      label.textContent = table.table_number;

      if (table.rotation) {
        label.setAttribute('transform', `rotate(${-table.rotation}, ${shapeInfo.textX}, ${shapeInfo.textY})`);
      }

      group.appendChild(label);

      tablesGroup.appendChild(group);
    });

    this.svg.appendChild(tablesGroup);
  },

  renderStallShape(table, ns) {
    // Read shape directly from API — no hardcoded orientation mapping.
    // Stored geometry is in feet; the path below is in drawing units.
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
    } else if (shape === 'L-Stall' || shape === 'L_BOT_LEFT' || shape.startsWith('L') || (table.label && table.label.includes('L-Stall'))) {
      // Standard base L-Stall (bottom-left corner)
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

      const tableId = parseInt(group.dataset.tableId);
      const table = this.tables.find(t => t.id === tableId);

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

      const tableId = parseInt(group.dataset.tableId);
      const table = this.tables.find(t => t.id === tableId);
      if (!table) return;

      const dims = Units.formatDims(table.width, table.height);
      tooltipTitle.textContent = `Stall ${table.table_number} — ${dims}`;

      if (table.status === 'booked') {
        tooltipDetail.innerHTML = `<span style="color: var(--status-booked);">Reserved</span>${table.booked_business ? ` &middot; ${this.escapeHtml(table.booked_business)}` : ''}`;
      } else if (table.status === 'blocked') {
        tooltipDetail.innerHTML = '<span style="color: var(--text-muted);">Unavailable</span>';
      } else {
        tooltipDetail.innerHTML = `${table.label || 'Stall'} &middot; ${Units.formatArea(table.width, table.height)} &middot; Click to book`;
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

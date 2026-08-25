/**
 * TableBook — Admin Events Management (Minimalist)
 */

let editingEventId = null;

document.addEventListener('DOMContentLoaded', () => {
  loadEvents();
});

async function loadEvents() {
  try {
    const res = await fetch('/api/admin/events');
    if (!res.ok) throw new Error('Failed to load events');
    const events = await res.json();

    const tbody = document.getElementById('events-table-body');

    if (events.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding: var(--space-xl);">No events created yet</td></tr>';
      return;
    }

    tbody.innerHTML = events.map(event => {
      const startDate = event.start_date ? new Date(event.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
      const endDate = event.end_date ? new Date(event.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      const dateStr = endDate ? `${startDate} &ndash; ${endDate}` : startDate;

      return `
        <tr>
          <td>
            <strong>${escapeHtml(event.name)}</strong>
            <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 2px;">${Units.formatFeet(event.hall_width)} &times; ${Units.formatFeet(event.hall_height)} hall</div>
          </td>
          <td style="color: var(--text-secondary);">${escapeHtml(event.venue || '—')}</td>
          <td style="white-space: nowrap;">${dateStr}</td>
          <td>${event.total_tables || 0}</td>
          <td>${event.total_bookings || 0}</td>
          <td><span class="badge badge-${event.status}">${event.status}</span></td>
          <td>
            <div class="actions-cell">
              <a href="/admin/layout-editor.html?id=${event.id}" class="btn btn-secondary btn-sm">Edit Layout</a>
              <button class="btn btn-secondary btn-sm" onclick="editEvent(${event.id})">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteEvent(${event.id}, '${escapeHtml(event.name)}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Events error:', err);
    showToast('Failed to load events', 'error');
  }
}

function openEventModal(event = null) {
  const modal = document.getElementById('event-modal-overlay');
  const title = document.getElementById('event-modal-title');
  const saveBtn = document.getElementById('save-event-btn');

  if (event) {
    editingEventId = event.id;
    title.textContent = 'Edit Event Details';
    saveBtn.textContent = 'Save Changes';

    document.getElementById('event-id').value = event.id;
    document.getElementById('event-name').value = event.name || '';
    document.getElementById('event-venue').value = event.venue || '';
    document.getElementById('event-description').value = event.description || '';
    document.getElementById('event-start-date').value = event.start_date || '';
    document.getElementById('event-end-date').value = event.end_date || '';
    document.getElementById('event-hall-width').value = event.hall_width || Units.DEFAULT_HALL_WIDTH_FT;
    document.getElementById('event-hall-height').value = event.hall_height || Units.DEFAULT_HALL_HEIGHT_FT;
    document.getElementById('event-status').value = event.status || 'draft';
  } else {
    editingEventId = null;
    title.textContent = 'Create New Event';
    saveBtn.textContent = 'Create Event';
    document.getElementById('event-form').reset();
    document.getElementById('event-hall-width').value = Units.DEFAULT_HALL_WIDTH_FT;
    document.getElementById('event-hall-height').value = Units.DEFAULT_HALL_HEIGHT_FT;
  }

  updateHallAreaHint();
  modal.classList.add('active');
}

/** Echo the hall footprint back in plain feet so the numbers stay tangible. */
function updateHallAreaHint() {
  const hint = document.getElementById('hall-area-hint');
  if (!hint) return;

  const widthFt = parseFloat(document.getElementById('event-hall-width').value);
  const heightFt = parseFloat(document.getElementById('event-hall-height').value);

  if (!isFinite(widthFt) || !isFinite(heightFt) || widthFt <= 0 || heightFt <= 0) {
    hint.textContent = 'Width × depth of the hall floor, measured in feet.';
    return;
  }

  hint.textContent = `${Units.formatFeet(widthFt)} × ${Units.formatFeet(heightFt)} floor — ${Units.formatArea(widthFt, heightFt)}`;
}

function closeEventModal() {
  document.getElementById('event-modal-overlay').classList.remove('active');
  editingEventId = null;
}

async function saveEvent() {
  const data = {
    name: document.getElementById('event-name').value.trim(),
    venue: document.getElementById('event-venue').value.trim(),
    description: document.getElementById('event-description').value.trim(),
    start_date: document.getElementById('event-start-date').value,
    end_date: document.getElementById('event-end-date').value,
    hall_width: Units.clampHallFt(document.getElementById('event-hall-width').value, Units.DEFAULT_HALL_WIDTH_FT),
    hall_height: Units.clampHallFt(document.getElementById('event-hall-height').value, Units.DEFAULT_HALL_HEIGHT_FT),
    status: document.getElementById('event-status').value
  };

  if (!data.name) {
    showToast('Event name is required', 'error');
    return;
  }

  try {
    let res;
    if (editingEventId) {
      res = await fetch(`/api/admin/events/${editingEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save event');
    }

    showToast(editingEventId ? 'Event updated' : 'Event created', 'success');
    closeEventModal();
    loadEvents();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function editEvent(id) {
  try {
    const res = await fetch(`/api/admin/events`);
    const events = await res.json();
    const event = events.find(e => e.id === id);
    if (event) {
      openEventModal(event);
    }
  } catch (err) {
    showToast('Failed to load event', 'error');
  }
}

async function deleteEvent(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"? This will delete all associated floor plan tables and reservations.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');

    showToast('Event deleted', 'success');
    loadEvents();
  } catch (err) {
    showToast('Failed to delete event', 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

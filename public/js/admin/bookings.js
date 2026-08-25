/**
 * TableBook — Admin Bookings Management (Minimalist)
 */

let currentFilters = { event_id: '', status: '', search: '' };
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  loadBookings();
  loadEventFilter();

  document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentFilters.search = e.target.value.trim();
      loadBookings();
    }, 300);
  });

  document.getElementById('filter-event').addEventListener('change', (e) => {
    currentFilters.event_id = e.target.value;
    loadBookings();
  });

  document.getElementById('filter-status').addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    loadBookings();
  });
});

async function loadEventFilter() {
  try {
    const res = await fetch('/api/admin/events');
    const events = await res.json();

    const select = document.getElementById('filter-event');
    events.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = e.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load event filter:', err);
  }
}

async function loadBookings() {
  try {
    const params = new URLSearchParams();
    if (currentFilters.event_id) params.set('event_id', currentFilters.event_id);
    if (currentFilters.status) params.set('status', currentFilters.status);
    if (currentFilters.search) params.set('search', currentFilters.search);

    const res = await fetch(`/api/admin/bookings?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load bookings');
    const bookings = await res.json();

    const tbody = document.getElementById('bookings-table-body');

    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding: var(--space-xl);">No reservations found</td></tr>';
      return;
    }

    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td><strong>${escapeHtml(b.reference_code)}</strong></td>
        <td>
          <div>${escapeHtml(b.customer_name)}</div>
          <div style="color: var(--text-muted); font-size: 0.75rem;">${escapeHtml(b.customer_phone)}</div>
        </td>
        <td style="color: var(--text-secondary); font-size: 0.85rem;">${escapeHtml(b.business_name || '—')}</td>
        <td><strong>${escapeHtml(b.table_number)}</strong></td>
        <td style="font-size: 0.85rem;">${escapeHtml(b.event_name)}</td>
        <td>₹${(b.table_price || 0).toLocaleString('en-IN')}</td>
        <td><span class="badge badge-${b.status}">${b.status}</span></td>
        <td style="color: var(--text-muted); font-size: 0.8rem; white-space: nowrap;">${formatDateTime(b.booked_at)}</td>
        <td>
          <div class="actions-cell">
            ${b.status === 'pending' ? `
              <button class="btn btn-success btn-sm" onclick="updateBookingStatus(${b.id}, 'confirmed')">Confirm</button>
            ` : ''}
            ${b.status !== 'cancelled' ? `
              <button class="btn btn-secondary btn-sm" onclick="updateBookingStatus(${b.id}, 'cancelled')">Cancel</button>
            ` : ''}
            <button class="btn btn-danger btn-sm" onclick="deleteBooking(${b.id})">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Bookings error:', err);
    showToast('Failed to load bookings', 'error');
  }
}

async function updateBookingStatus(id, status) {
  const action = status === 'confirmed' ? 'confirm' : 'cancel';
  if (!confirm(`Are you sure you want to ${action} this reservation?`)) return;

  try {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (!res.ok) throw new Error('Failed to update');

    showToast(`Reservation ${status === 'confirmed' ? 'confirmed' : 'cancelled'}`, 'success');
    loadBookings();
  } catch (err) {
    showToast('Failed to update reservation', 'error');
  }
}

async function deleteBooking(id) {
  if (!confirm('Are you sure you want to delete this reservation record?')) return;

  try {
    const res = await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');

    showToast('Reservation deleted', 'success');
    loadBookings();
  } catch (err) {
    showToast('Failed to delete reservation', 'error');
  }
}

function exportBookings() {
  const params = new URLSearchParams();
  if (currentFilters.event_id) params.set('event_id', currentFilters.event_id);
  window.open(`/api/admin/bookings/export?${params.toString()}`, '_blank');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

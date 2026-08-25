/**
 * TableBook — Admin Dashboard Logic (Minimalist)
 */

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});

async function loadDashboard() {
  try {
    const res = await fetch('/api/admin/dashboard');
    if (!res.ok) throw new Error('Failed to load dashboard');
    const data = await res.json();

    document.getElementById('stat-active-events').textContent = data.activeEvents;
    document.getElementById('stat-total-bookings').textContent = data.totalBookings;
    document.getElementById('stat-pending').textContent = data.pendingBookings;
    document.getElementById('stat-revenue').textContent = `₹${data.totalRevenue.toLocaleString('en-IN')}`;

    const tbody = document.getElementById('recent-bookings-table');
    if (data.recentBookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding: var(--space-xl);">No reservations recorded yet</td></tr>';
      return;
    }

    tbody.innerHTML = data.recentBookings.map(b => `
      <tr>
        <td><strong>${escapeHtml(b.reference_code)}</strong></td>
        <td>${escapeHtml(b.customer_name)}</td>
        <td>${escapeHtml(b.table_number)}</td>
        <td>${escapeHtml(b.event_name)}</td>
        <td><span class="badge badge-${b.status}">${b.status}</span></td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${formatDateTime(b.booked_at)}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Dashboard error:', err);
    showToast('Failed to load dashboard', 'error');
  }
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

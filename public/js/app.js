/**
 * TableBook — Homepage Logic (Minimalist)
 */

document.addEventListener('DOMContentLoaded', () => {
  loadEvents();
});

async function loadEvents() {
  const grid = document.getElementById('events-grid');
  const loader = document.getElementById('events-loader');
  const empty = document.getElementById('events-empty');

  try {
    const response = await fetch('/api/events');
    const events = await response.json();

    if (loader) loader.remove();

    if (events.length === 0) {
      grid.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }

    grid.innerHTML = events.map((event) => createEventCard(event)).join('');

  } catch (err) {
    console.error('Failed to load events:', err);
    if (loader) loader.innerHTML = '<p style="color: #f43f5e;">Failed to load events. Please refresh.</p>';
  }
}

function createEventCard(event) {
  const startDate = event.start_date ? new Date(event.start_date) : null;
  const endDate = event.end_date ? new Date(event.end_date) : null;

  const dateRange = startDate && endDate
    ? `${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} &ndash; ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : startDate
    ? startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date TBD';

  const total = event.total_tables || 0;
  const available = event.available_tables || 0;

  return `
    <div class="card event-card" onclick="window.location.href='/event.html?id=${event.id}'">
      <div class="event-card-header">
        <h3>${escapeHtml(event.name)}</h3>
        <span class="badge badge-active">${available} Available</span>
      </div>

      <div class="event-venue">
        ${escapeHtml(event.venue || 'Venue TBD')} &middot; ${dateRange}
      </div>

      ${event.description ? `<div class="event-description">${escapeHtml(event.description)}</div>` : ''}

      <div class="event-stats">
        <span class="availability-text">${available} of ${total} stalls available</span>
        <span class="btn btn-secondary btn-sm">Select Stall &rarr;</span>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

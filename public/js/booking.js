/**
 * TableBook — Booking Form Logic
 * Works with the centered modal in event.html
 */

document.addEventListener('DOMContentLoaded', () => {
  const submitBtn = document.getElementById('submit-booking-btn');
  const form = document.getElementById('booking-form');

  if (submitBtn) {
    submitBtn.addEventListener('click', handleBookingSubmit);
  }

  if (form) {
    form.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleBookingSubmit();
      }
    });
  }
});

async function handleBookingSubmit() {
  const submitBtn = document.getElementById('submit-booking-btn');
  const errorEl = document.getElementById('form-error');

  const tableId = document.getElementById('booking-table-id').value;
  const eventId = document.getElementById('booking-event-id').value;
  const name = document.getElementById('customer-name').value.trim();
  const phone = document.getElementById('customer-phone').value.trim();
  const email = document.getElementById('customer-email').value.trim();
  const business = document.getElementById('business-name').value.trim();
  const notes = document.getElementById('booking-notes').value.trim();

  errorEl.classList.add('hidden');

  if (!name) {
    showFormError('Full name is required.');
    return;
  }

  if (!phone) {
    showFormError('Phone number is required.');
    return;
  }

  const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
  if (cleanPhone.length < 10) {
    showFormError('Please provide a valid contact phone number.');
    return;
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFormError('Please provide a valid email address.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';

  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table_id: parseInt(tableId),
        event_id: parseInt(eventId),
        customer_name: name,
        customer_phone: phone,
        customer_email: email,
        business_name: business,
        notes: notes
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Booking failed');
    }

    sessionStorage.setItem('lastBooking', JSON.stringify(data.booking));
    window.location.href = '/booking-success.html';

  } catch (err) {
    console.error('Booking error:', err);
    showFormError(err.message || 'Something went wrong. Please try again.');
    showToast(err.message || 'Booking failed', 'error');

    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm Reservation';
  }
}

function showFormError(message) {
  const errorEl = document.getElementById('form-error');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
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

// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {
    // --- Admin Login/Logout Logic ---
    if (window.location.pathname.includes('admin.html')) {
        const loginModal = document.getElementById('login-modal');
        const adminContent = document.getElementById('admin-content');
        const loginForm = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout-btn');

        // Check if user is already logged in via session storage
        if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
            loginModal.style.display = 'none';
            adminContent.style.display = 'block';
        } else {
            loginModal.style.display = 'flex';
        }

        // Add close functionality to the login modal
        const closeLoginModalBtn = loginModal.querySelector('.close-button');
        if (closeLoginModalBtn) {
            closeLoginModalBtn.addEventListener('click', () => {
                window.location.href = 'index.html'; // Redirect to home page
            });
        }
        window.addEventListener('click', (event) => {
            if (event.target === loginModal) {
                window.location.href = 'index.html'; // Also redirect on background click
            }
        });

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('admin-password').value;
            const loginError = document.getElementById('login-error');
            if (password === '5555') {
                sessionStorage.setItem('isAdminLoggedIn', 'true');
                loginModal.style.display = 'none';
                adminContent.style.display = 'block';
            } else {
                loginError.style.display = 'block';
            }
        });

        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('isAdminLoggedIn');
            window.location.href = 'index.html';
        });
    }

    // --- Bill Modal Logic ---
    const billModal = document.getElementById('bill-modal');
    if (billModal) {
        const closeBillModalBtn = billModal.querySelector('.close-button');
        closeBillModalBtn.addEventListener('click', () => billModal.style.display = 'none');
        window.addEventListener('click', (event) => {
            if (event.target === billModal) {
                billModal.style.display = 'none';
            }
        });
    }

    // --- Common Elements ---
    const modal = document.getElementById('booking-modal');

    // --- Update Room Availability on Main Page ---
    if (document.getElementById('room-container')) {
        // Initially show availability for today
        updateRoomAvailability();

        const availabilityForm = document.getElementById('availability-form');
        const clearFilterBtn = document.getElementById('clear-filter-btn');

        availabilityForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const checkIn = document.getElementById('filter-check-in').value;
            const checkOut = document.getElementById('filter-check-out').value;
            if (checkIn && checkOut) {
                updateRoomAvailability(new Date(checkIn), new Date(checkOut));
                clearFilterBtn.style.display = 'inline-block';
            }
        });

        clearFilterBtn.addEventListener('click', () => {
            availabilityForm.reset();
            updateRoomAvailability(); // Reset to show today's availability
            clearFilterBtn.style.display = 'none';
        });
    }

    const closeModalButton = document.querySelector('#booking-modal .close-button');
    const bookingForm = document.getElementById('booking-form');
    const roomTypeInput = document.getElementById('modal-room-type');
    const reservationIdInput = document.getElementById('modal-reservation-id');

    // --- Function to close the modal ---
    function closeModal() {
        if (modal) modal.style.display = 'none';
    }

    if (modal) {
        // --- Event listeners for closing the modal ---
        closeModalButton.addEventListener('click', closeModal);
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        // --- Handle the booking form submission ---
        bookingForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent the form from submitting the traditional way

            const formData = new FormData(bookingForm);
            const guestName = formData.get('guestName');
            const roomType = formData.get('roomType');
            const checkIn = formData.get('checkInDate');
            const checkOut = formData.get('checkOutDate');
            const numGuests = formData.get('numGuests');
            const reservationId = formData.get('reservationId');

            // Simple validation
            if (!guestName || !checkIn || !checkOut) {
                alert('Please fill out all required fields.');
                return;
            }

            const newCheckInDate = new Date(checkIn);
            const newCheckOutDate = new Date(checkOut);

            // More advanced validation
            if (newCheckOutDate <= newCheckInDate) {
                alert('Error: Check-out date must be after the check-in date.');
                return;
            }

            // Get existing reservations or initialize an empty array
            let reservations = JSON.parse(localStorage.getItem('reservations')) || [];

            // --- Double Booking Validation ---
            const isDoubleBooked = reservations.some(res => {
                // If we are editing a reservation, skip checking it against itself
                if (reservationId && res.id === reservationId) {
                    return false;
                }
                // Only check for conflicts in the same room type
                if (res.roomType === roomType) {
                    const existingCheckIn = new Date(res.checkInDate);
                    const existingCheckOut = new Date(res.checkOutDate);
                    // The overlap condition: (StartA < EndB) and (EndA > StartB)
                    return newCheckInDate < existingCheckOut && newCheckOutDate > existingCheckIn;
                }
                return false;
            });

            if (isDoubleBooked) {
                alert(`Sorry, the ${roomType} is already booked for the selected dates. Please choose different dates.`);
                return;
            }

            if (reservationId) {
                // --- UPDATE EXISTING RESERVATION ---
                const reservationIndex = reservations.findIndex(res => res.id === reservationId);
                if (reservationIndex > -1) {
                    reservations[reservationIndex] = { ...reservations[reservationIndex], guestName, checkInDate: checkIn, checkOutDate: checkOut, numGuests };
                    alert(`Reservation #${reservationId} has been updated successfully!`);
                }
            } else {
                // --- SAVE NEW RESERVATION TO LOCALSTORAGE ---
                const newReservation = {
                    id: `#${Date.now().toString().slice(-5)}`, // Create a simple unique ID
                    guestName,
                    roomType,
                    checkInDate: checkIn,
                    status: 'active', // Add a status for new bookings
                    checkOutDate: checkOut,
                    numGuests,
                };
                reservations.push(newReservation);
                alert(`Thank you, ${guestName}!\nYour booking for the ${roomType} is confirmed.`);
            }

            localStorage.setItem('reservations', JSON.stringify(reservations));

            closeModal();
            bookingForm.reset(); // Clear the form for the next booking

            // If on admin page, refresh the table to show changes
            if (window.location.pathname.includes('admin.html')) {
                loadReservationsIntoTable();
            }
        });
    }

    // --- Admin Page Logic (if reservations-table exists) ---
    const reservationsTable = document.getElementById('reservations-table');
    if (reservationsTable) {
        // Add search functionality
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const tableRows = reservationsTable.querySelectorAll('tbody tr');

            tableRows.forEach(row => {
                // The guest name is in the second cell (index 1)
                const guestNameCell = row.cells[1];
                if (guestNameCell) {
                    const guestName = guestNameCell.textContent.toLowerCase();
                    if (guestName.includes(searchTerm)) {
                        row.style.display = ''; // Show row
                    } else {
                        row.style.display = 'none'; // Hide row
                    }
                }
            });
        });

        // Initial load of the table
        loadReservationsIntoTable();
    }

    function loadReservationsIntoTable() {
        const tableBody = document.querySelector('#reservations-table tbody');
        if (!tableBody) return;

        const reservations = JSON.parse(localStorage.getItem('reservations')) || [];
        tableBody.innerHTML = ''; // Clear existing content
        
        if (reservations.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No reservations found.</td></tr>';
        } else {
            reservations.forEach(res => {
                const row = document.createElement('tr');
                const isCheckedOut = res.status === 'checked-out';

                row.setAttribute('data-id', res.id);
                if (isCheckedOut) {
                    row.classList.add('checked-out-row');
                }

                row.innerHTML = `
                    <td>${res.id}</td>
                    <td>${res.guestName}</td>
                    <td>${res.roomType}</td>
                    <td>${res.checkInDate}</td>
                    <td>${res.checkOutDate}</td>
                    <td>${res.numGuests}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-small" onclick="editReservation('${res.id}')" ${isCheckedOut ? 'disabled' : ''}>Edit</button>
                            <button class="btn-danger btn-small" onclick="cancelReservation(this, '${res.id}')" ${isCheckedOut ? 'disabled' : ''}>Cancel</button>
                            <button class="btn btn-success btn-small" onclick="markAsCheckedOut('${res.id}')" ${isCheckedOut ? 'disabled' : ''}>Checked Out</button>
                            <button class="btn btn-small" onclick="generateBill('${res.id}')">Bill</button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }
});

/**
 * Checks reservations and updates the UI to show which rooms are booked for a given date range.
 * If no range is provided, it checks for today.
 * @param {Date} [startDate] - The start of the date range to check.
 * @param {Date} [endDate] - The end of the date range to check.
 */
function updateRoomAvailability(startDate, endDate) {
    const reservations = JSON.parse(localStorage.getItem('reservations')) || [];
    const roomCards = document.querySelectorAll('.room-card');

    // If no dates are provided, default to checking for today
    const checkStartDate = startDate || new Date();
    if (!startDate) checkStartDate.setHours(0, 0, 0, 0);

    // If no end date, default to one day after the start date
    const checkEndDate = endDate || new Date(checkStartDate.getTime() + 24 * 60 * 60 * 1000);

    roomCards.forEach(card => {
        const roomType = card.querySelector('h3').textContent;
        const button = card.querySelector('button');

        const isBookedInRange = reservations.some(res => {
            if (res.roomType === roomType && res.status !== 'checked-out') {
                const existingCheckIn = new Date(res.checkInDate);
                const existingCheckOut = new Date(res.checkOutDate);
                // Overlap condition: (StartA < EndB) and (EndA > StartB)
                return checkStartDate < existingCheckOut && checkEndDate > existingCheckIn;
            }
            return false;
        });

        if (isBookedInRange) {
            card.classList.add('booked');
            button.textContent = 'Unavailable';
        } else {
            // If not booked, make sure it's shown as available
            card.classList.remove('booked');
            button.textContent = 'Book Now';
        }
    });
}

/**
 * Opens the modal to book a room.
 * @param {string} roomType - The type of room being booked.
 */
window.bookRoom = function(roomType) {
    const modal = document.getElementById('booking-modal');
    const bookingForm = document.getElementById('booking-form');
    if (!modal || !bookingForm) return;

    bookingForm.reset(); // Clear form from previous use
    modal.querySelector('h2').textContent = 'Book Your Stay';
    bookingForm.querySelector('button[type="submit"]').textContent = 'Confirm Booking';

    // Set form values for a new booking
    bookingForm.querySelector('#modal-room-type').value = roomType;
    bookingForm.querySelector('#modal-reservation-id').value = '';
    modal.style.display = 'flex'; // Show the modal
};

// A central object to store room prices. This is more maintainable than parsing from HTML.
const roomPrices = {
    'Deluxe Queen Room': 12500,
    'Executive Suite': 20000,
    'Family Room': 16000,
    'Honeymoon Suite': 25000,
    'Standard Single': 8000,
    'Presidential Suite': 75000,
    'Twin Room': 10000,
    'Accessible Room': 12500
};

/**
 * Simulates generating a bill for a reservation.
 * @param {string} reservationId - The ID of the reservation.
 */
window.generateBill = function(reservationId) {
    const billModal = document.getElementById('bill-modal');
    const billDetailsContainer = document.getElementById('bill-details');
    if (!billModal || !billDetailsContainer) return;

    const reservations = JSON.parse(localStorage.getItem('reservations')) || [];
    const reservation = reservations.find(res => res.id === reservationId);

    if (!reservation) {
        alert('Error: Reservation not found.');
        return;
    }

    const pricePerNight = roomPrices[reservation.roomType];
    if (!pricePerNight) {
        alert(`Error: Price for room type "${reservation.roomType}" not found.`);
        return;
    }

    const checkInDate = new Date(reservation.checkInDate);
    const checkOutDate = new Date(reservation.checkOutDate);

    // Validate dates before calculation
    if (isNaN(checkInDate) || isNaN(checkOutDate) || checkOutDate <= checkInDate) {
        alert('Invalid check-in or check-out date for this reservation. Cannot calculate bill.');
        return;
    }

    const timeDifference = checkOutDate.getTime() - checkInDate.getTime();
    const numberOfNights = Math.ceil(timeDifference / (1000 * 3600 * 24)); // 1 day in milliseconds

    const totalCost = pricePerNight * numberOfNights;

    // Format the cost to Indian currency style (e.g., ₹1,20,000)
    const formattedCost = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(totalCost);

    // Populate the bill modal
    billDetailsContainer.innerHTML = `
        <div class="bill-row">
            <span>Guest Name:</span>
            <span>${reservation.guestName}</span>
        </div>
        <div class="bill-row">
            <span>Room Type:</span>
            <span>${reservation.roomType}</span>
        </div>
        <div class="bill-row">
            <span>Number of Nights:</span>
            <span>${numberOfNights}</span>
        </div>
        <div class="bill-row bill-total">
            <span>Total Amount:</span>
            <span>${formattedCost}</span>
        </div>
    `;
    billModal.style.display = 'flex';
};

/**
 * Opens the modal to edit an existing reservation.
 * @param {string} reservationId - The ID of the reservation to edit.
 */
window.editReservation = function(reservationId) {
    const reservations = JSON.parse(localStorage.getItem('reservations')) || [];
    const reservation = reservations.find(res => res.id === reservationId);
    if (!reservation) {
        alert('Error: Reservation not found.');
        return;
    }

    const modal = document.getElementById('booking-modal');
    const form = document.getElementById('booking-form');

    // Pre-fill the form
    form.querySelector('#modal-reservation-id').value = reservation.id;
    form.querySelector('#modal-room-type').value = reservation.roomType;
    form.querySelector('#guest-name').value = reservation.guestName;
    form.querySelector('#check-in-date').value = reservation.checkInDate;
    form.querySelector('#check-out-date').value = reservation.checkOutDate;
    form.querySelector('#num-guests').value = reservation.numGuests;

    // Update modal titles and show it
    modal.querySelector('h2').textContent = `Edit Reservation ${reservation.id}`;
    form.querySelector('button[type="submit"]').textContent = 'Update Booking';
    modal.style.display = 'flex';
};

/**
 * Simulates canceling a reservation from the admin panel.
 * @param {HTMLElement} buttonElement - The button element that was clicked.
 * @param {string} reservationId - The ID of the reservation to cancel.
 */
function cancelReservation(buttonElement, reservationId) {
    const row = buttonElement.closest('tr');
    const guestName = row.cells[1].textContent;
    const roomType = row.cells[2].textContent;

    if (confirm(`Are you sure you want to cancel the reservation for ${guestName} in the ${roomType}?`)) {
        row.remove();
        alert("Reservation canceled successfully.");

        // Remove from localStorage
        let reservations = JSON.parse(localStorage.getItem('reservations')) || [];
        reservations = reservations.filter(res => res.id !== reservationId);
        localStorage.setItem('reservations', JSON.stringify(reservations));
    }
}

// We need to make cancelReservation globally accessible since it's called via an inline onclick handler.
// A better practice would be to add event listeners programmatically, but this works for now.
window.cancelReservation = cancelReservation;

/**
 * Marks a reservation as 'checked-out'.
 * @param {string} reservationId - The ID of the reservation to update.
 */
window.markAsCheckedOut = function(reservationId) {
    let reservations = JSON.parse(localStorage.getItem('reservations')) || [];
    const reservationIndex = reservations.findIndex(res => res.id === reservationId);

    if (reservationIndex > -1) {
        reservations[reservationIndex].status = 'checked-out';
        localStorage.setItem('reservations', JSON.stringify(reservations));
        // Reload the table to reflect the change
        document.dispatchEvent(new Event('DOMContentLoaded'));
    } else {
        alert('Error: Could not find reservation to mark as checked out.');
    }
};

// Inject styles for the search bar
const style = document.createElement('style');
style.innerHTML = `
    .search-container {
        margin-bottom: 1.5rem;
    }
    #search-input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ced4da;
        border-radius: 5px;
        box-sizing: border-box;
        font-size: 1rem;
    }
`;
document.head.appendChild(style);
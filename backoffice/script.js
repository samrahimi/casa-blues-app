const password = 'admin'; // Replace with a more secure method
const loginContainer = document.getElementById('login-container');
const adminContainer = document.getElementById('admin-container');
const reservationsDiv = document.getElementById('reservations');
const unitsGrid = document.getElementById('units-grid');
let allReservations = [];
let units = [];
let siteContent = null;

// Function to fetch site content
async function fetchSiteContent() {
    try {
        const response = await fetch('/site-content');
        siteContent = await response.json();
        displaySiteContent();
    } catch (error) {
        alert('Error fetching site content: ' + error.message);
    }
}

// Function to display site content
function displaySiteContent() {
    if (!siteContent) return;

    // Update preview images
    document.getElementById('hero-preview').src = siteContent.hero_image || '';
    document.getElementById('about1-preview').src = siteContent.about_image1 || '';
    document.getElementById('about2-preview').src = siteContent.about_image2 || '';
    
    // Update about text
    document.getElementById('about-text').value = siteContent.about_text || '';
}

// Function to update about text
async function updateAboutText() {
    const aboutText = document.getElementById('about-text').value;
    
    try {
        const response = await fetch('/site-content', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ about_text: aboutText })
        });

        if (!response.ok) throw new Error('Failed to update about text');
        
        alert('About text updated successfully');
        await fetchSiteContent(); // Refresh the display
    } catch (error) {
        alert('Error updating about text: ' + error.message);
    }
}

// Function to handle site image uploads
async function uploadSiteImage(type) {
    const fileInput = document.getElementById(`${type === 'hero' ? 'hero-image' : `about-image${type.slice(-1)}`}`);
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file first');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`/site-content/${type}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Failed to upload image');

        const result = await response.json();
        alert('Image uploaded successfully');
        await fetchSiteContent(); // Refresh the display
    } catch (error) {
        alert('Error uploading image: ' + error.message);
    }
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelector(`.tab-button[onclick="switchTab('${tabName}')"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Fetch site content when switching to site-content tab
    if (tabName === 'site-content') {
        fetchSiteContent();
    }
}

function login() {
    const inputPassword = document.getElementById('password').value;
    if (inputPassword === password) {
        loginContainer.style.display = 'none';
        adminContainer.style.display = 'block';
        fetchReservations();
        fetchUnits();
        fetchSiteContent();
    } else {
        alert('Incorrect password');
    }
}

async function fetchUnits() {
    try {
        const response = await fetch('/units');
        units = await response.json();
        displayUnits();
    } catch (error) {
        alert('Error fetching units: ' + error.message);
    }
}

function displayUnits() {
    unitsGrid.innerHTML = '';
    units.forEach(unit => {
        const unitDiv = document.createElement('div');
        unitDiv.classList.add('unit-card');
        unitDiv.innerHTML = `
            <h3>${unit.name}</h3>
            <div class="unit-photo">
                ${unit.primary_photo ?
                    `<img src="${unit.primary_photo}" alt="${unit.name}" class="unit-preview">` :
                    '<p>No primary photo set</p>'
                }
                <div class="photo-upload">
                    <label for="photo-${unit.name.replace(/\s+/g, '-')}">Upload Primary Photo:</label>
                    <input type="file"
                           id="photo-${unit.name.replace(/\s+/g, '-')}"
                           accept="image/jpeg,image/png,image/webp"
                           onchange="handlePhotoUpload('${unit.name}', this.files[0])">
                </div>
            </div>
            <div class="gallery-section">
                <h4>Photo Gallery</h4>
                <div class="gallery-grid" id="gallery-${unit.name.replace(/\s+/g, '-')}">
                    ${unit.gallery_photos && unit.gallery_photos.length > 0 ?
                        unit.gallery_photos.map(photo => `
                            <div class="gallery-item">
                                <img src="${photo.photo_path}" alt="${unit.name} gallery photo">
                                <button class="remove-photo" onclick="removeGalleryPhoto('${unit.name}', ${photo.id})">×</button>
                            </div>
                        `).join('') :
                        '<p>No gallery photos yet</p>'
                    }
                </div>
                <div class="gallery-upload">
                    <label for="gallery-${unit.name.replace(/\s+/g, '-')}-upload">Add Photo to Gallery:</label>
                    <input type="file"
                           id="gallery-${unit.name.replace(/\s+/g, '-')}-upload"
                           accept="image/jpeg,image/png,image/webp"
                           onchange="handleGalleryUpload('${unit.name}', this.files[0])">
                </div>
            </div>
            <div class="unit-input">
                <label>Description</label>
                <textarea id="description-${unit.name.replace(/\s+/g, '-')}">${unit.description}</textarea>
            </div>
            <div class="unit-input">
                <label>Daily Rate (pesos)</label>
                <input type="number" step="0.01" min="0" value="${unit.daily_rate}" 
                       id="daily-${unit.name.replace(/\s+/g, '-')}">
            </div>
            <div class="unit-input">
                <label>Weekly Rate (pesos)</label>
                <input type="number" step="0.01" min="0" value="${unit.weekly_rate}"
                       id="weekly-${unit.name.replace(/\s+/g, '-')}">
            </div>
            <div class="unit-input">
                <label>Monthly Rate (pesos)</label>
                <input type="number" step="0.01" min="0" value="${unit.monthly_rate}"
                       id="monthly-${unit.name.replace(/\s+/g, '-')}">
            </div>
            <button class="save-unit-btn" onclick="updateUnit('${unit.name}')">
                Save Changes
            </button>
        `;
        unitsGrid.appendChild(unitDiv);
    });
}

async function handlePhotoUpload(unitName, file) {
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
        const response = await fetch(`/units/${encodeURIComponent(unitName)}/photo`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload photo');
        }

        const result = await response.json();
        alert('Photo uploaded successfully');
        fetchUnits(); // Refresh the display
    } catch (error) {
        alert('Error uploading photo: ' + error.message);
    }
}

async function handleGalleryUpload(unitName, file) {
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
        const response = await fetch(`/units/${encodeURIComponent(unitName)}/gallery`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload gallery photo');
        }

        const result = await response.json();
        alert('Photo added to gallery successfully');
        fetchUnits(); // Refresh the display
    } catch (error) {
        alert('Error uploading gallery photo: ' + error.message);
    }
}

async function removeGalleryPhoto(unitName, photoId) {
    if (!confirm('Are you sure you want to remove this photo from the gallery?')) {
        return;
    }

    try {
        const response = await fetch(`/units/${encodeURIComponent(unitName)}/gallery/${photoId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to remove gallery photo');
        }

        alert('Photo removed from gallery successfully');
        fetchUnits(); // Refresh the display
    } catch (error) {
        alert('Error removing gallery photo: ' + error.message);
    }
}

async function updateUnit(unitName) {
    const unitId = unitName.replace(/\s+/g, '-');
    const description = document.getElementById(`description-${unitId}`).value;
    const dailyRate = document.getElementById(`daily-${unitId}`).value;
    const weeklyRate = document.getElementById(`weekly-${unitId}`).value;
    const monthlyRate = document.getElementById(`monthly-${unitId}`).value;

    try {
        const response = await fetch(`/units/${encodeURIComponent(unitName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description: description,
                daily_rate: parseFloat(dailyRate),
                weekly_rate: parseFloat(weeklyRate),
                monthly_rate: parseFloat(monthlyRate)
            })
        });
        
        if (!response.ok) throw new Error('Failed to update unit');
        alert('Unit information updated successfully');
        fetchUnits(); // Refresh the display
    } catch (error) {
        alert('Error updating unit: ' + error.message);
    }
}

async function fetchReservations() {
    const response = await fetch('/reservations');
    allReservations = await response.json();
    displayReservations();
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function handleFilterChange() {
    displayReservations();
}

function getSelectedStatuses() {
    const checkboxes = document.querySelectorAll('.filters input[type="checkbox"]');
    return Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
}

function calculateStayDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

function displayReservations() {
    reservationsDiv.innerHTML = '';
    const selectedStatuses = getSelectedStatuses();
    
    // Filter and sort reservations
    const filteredReservations = allReservations
        .filter(reservation => selectedStatuses.includes(reservation.status.toLowerCase()))
        .sort((a, b) => new Date(b.start_time) - new Date(a.start_time)); // Most recent first

    filteredReservations.forEach(reservation => {
        const reservationDiv = document.createElement('div');
        reservationDiv.classList.add('reservation');
        
        const statusClass = `status-${reservation.status.toLowerCase()}`;
        const days = calculateStayDuration(reservation.start_time, reservation.end_time);
        const priceDisplay = reservation.total_price ? 
            `<div class="price-info">
                ${days} night${days > 1 ? 's' : ''} | Total: ${reservation.total_price} pesos
            </div>` : 
            `<div class="price-info" style="color: #666;">
                ${days} night${days > 1 ? 's' : ''} | Price not available
            </div>`;
        
        reservationDiv.innerHTML = `
            <div class="status-badge ${statusClass}">${reservation.status.toUpperCase()}</div>
            <div class="reservation-info">
                <div>
                    <p><strong>Unit:</strong> ${reservation.unit}</p>
                    <p><strong>Check-in:</strong> ${formatDate(reservation.start_time)}</p>
                    <p><strong>Check-out:</strong> ${formatDate(reservation.end_time)}</p>
                    <p><strong>Name:</strong> ${reservation.name || 'N/A'}</p>
                    <p><strong>Email:</strong> ${reservation.email || 'N/A'}</p>
                </div>
                <div>
                    <p><strong>Phone:</strong> ${reservation.phone || 'N/A'}</p>
                    <p><strong>Group Size:</strong> ${reservation.group_size || 'N/A'}</p>
                    <p><strong>Notes:</strong> ${reservation.notes || 'N/A'}</p>
                    ${priceDisplay}
                </div>
            </div>
            ${reservation.status === 'pending' ? `
                <div class="reservation-actions">
                    <button class="approve-btn" onclick="updateReservation(${reservation.id}, 'approved')">Approve</button>
                    <button class="reject-btn" onclick="updateReservation(${reservation.id}, 'rejected')">Reject</button>
                </div>
            ` : ''}
        `;
        reservationsDiv.appendChild(reservationDiv);
    });
}

async function updateReservation(id, status) {
    try {
        const response = await fetch(`/reservations/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        if (!response.ok) throw new Error('Failed to update reservation');
        fetchReservations();
    } catch (error) {
        alert('Error updating reservation: ' + error.message);
    }
}
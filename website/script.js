// Fetch and display site content
async function fetchSiteContent() {
  try {
    const response = await fetch('/site-content');
    const content = await response.json();
    
    // Update hero image if available
    if (content.hero_image) {
      document.querySelector('.hero').style.backgroundImage = `url(${content.hero_image})`;
    }
    
    // Update about text if available
    if (content.about_text) {
      document.querySelector('.about-text').textContent = content.about_text;
    }
    
    // Update about images if available
    const aboutImages = document.querySelector('.about-images');
    if (aboutImages) {
      const images = aboutImages.querySelectorAll('img');
      if (content.about_image1 && images[0]) {
        images[0].src = content.about_image1;
      }
      if (content.about_image2 && images[1]) {
        images[1].src = content.about_image2;
      }
    }
  } catch (error) {
    console.error('Error fetching site content:', error);
  }
}

// Fetch and display units when the page loads
async function fetchUnits() {
  try {
    const response = await fetch('/units');
    const units = await response.json();
    const container = document.getElementById('units-container');
    
    container.innerHTML = units.map(unit => `
      <div class="bg-white shadow-md rounded-lg overflow-hidden transition hover:shadow-lg">
        <img src="${unit.primary_photo || 'https://placehold.co/600x400'}" 
             alt="${unit.name}" 
             class="w-full h-64 object-cover">
        <div class="p-6">
          <h3 class="text-2xl font-bold brand-blue mb-2">${unit.name}</h3>
          <p class="text-gray-700 mb-4">${unit.description}</p>
          <p class="text-gray-700 font-semibold mb-4">${unit.daily_rate} pesos / night | ${unit.weekly_rate} pesos / week</p>
          <div class="flex flex-wrap gap-2 mb-4">
            ${unit.gallery_photos && unit.gallery_photos.length > 0 ?
              unit.gallery_photos.slice(0, 3).map(photo => `
                <img src="${photo.photo_path}"
                     alt="${unit.name} gallery photo"
                     class="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-75 transition"
                     onclick="openGallery('${unit.name}')">
              `).join('') +
              (unit.gallery_photos.length > 3 ?
                `<div class="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition"
                     onclick="openGallery('${unit.name}')">
                  <span class="text-gray-600">+${unit.gallery_photos.length - 3}</span>
                </div>` : '')
              : ''
            }
          </div>
          <div class="flex gap-2">
            <a href="#" class="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition" onclick="openGallery('${unit.name}')">
              <i class="fas fa-images mr-2"></i>See All Photos
            </a>
            <a href="#" class="bg-brand-accent text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition" onclick="openModal('${unit.name}', ${unit.daily_rate}, ${unit.weekly_rate})">Book Now</a>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error fetching units:', error);
  }
}

// Gallery functions
async function openGallery(unitName) {
  const galleryModal = document.getElementById('galleryModal');
  const galleryUnitName = document.getElementById('gallery-unit-name');
  const galleryGrid = document.getElementById('gallery-grid');
  
  galleryUnitName.textContent = unitName;
  
  try {
    // Fetch the latest unit data to get gallery photos
    const response = await fetch('/units');
    const units = await response.json();
    const unit = units.find(u => u.name === unitName);
    
    if (unit && unit.gallery_photos && unit.gallery_photos.length > 0) {
      // Display all gallery photos
      const galleryImages = unit.gallery_photos.map(photo => `
        <div class="gallery-item">
          <img src="${photo.photo_path}" alt="${unitName} gallery photo">
        </div>
      `).join('');
      
      // Add the primary photo at the start if it exists
      const primaryPhotoHtml = unit.primary_photo ? `
        <div class="gallery-item">
          <img src="${unit.primary_photo}" alt="${unitName} primary photo">
        </div>
      ` : '';
      
      galleryGrid.innerHTML = primaryPhotoHtml + galleryImages;
    } else {
      galleryGrid.innerHTML = `
        <div class="text-center text-gray-400 py-8">
          <i class="fas fa-images text-4xl mb-2"></i>
          <p>No photos available</p>
        </div>
      `;
    }
    
    galleryModal.style.display = 'block';
    // Prevent body scrolling when gallery is open
    document.body.style.overflow = 'hidden';
  } catch (error) {
    console.error('Error fetching gallery photos:', error);
    galleryModal.style.display = 'none';
  }
}

function closeGallery() {
  const galleryModal = document.getElementById('galleryModal');
  galleryModal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Close gallery when clicking outside
document.getElementById('galleryModal').addEventListener('click', function(event) {
  if (event.target === this) {
    closeGallery();
  }
});

// Modal variables and functions
const modal = document.getElementById('bookingModal');
const modalUnitName = document.getElementById('modal-unit-name');
const bookingForm = document.getElementById('booking-form');
const successMessage = document.getElementById('success-message');
let selectedUnit = '';
let selectedUnitDailyRate = 0;
let selectedUnitWeeklyRate = 0;

function openModal(unit, dailyRate, weeklyRate) {
  selectedUnit = unit;
  selectedUnitDailyRate = dailyRate;
  selectedUnitWeeklyRate = weeklyRate;
  modalUnitName.textContent = unit;
  modal.style.display = "block";
  document.getElementById('availability-message').textContent = '';
  document.getElementById('price-info').classList.add('hidden');
  document.getElementById('booking-details').style.display = 'none';
  successMessage.style.display = 'none';
  bookingForm.reset();
}

function closeModal() {
  modal.style.display = "none";
  bookingForm.reset();
}

window.onclick = function(event) {
  if (event.target == modal) {
    closeModal();
  }
}

// Set minimum date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('start_date').min = today;
document.getElementById('end_date').min = today;

// Update end date minimum when start date changes
document.getElementById('start_date').addEventListener('change', function() {
  document.getElementById('end_date').min = this.value;
  if (document.getElementById('end_date').value < this.value) {
    document.getElementById('end_date').value = this.value;
  }
});

function calculatePrice(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  // Calculate total price based on length of stay
  let totalPrice;
  if (days >= 7) {
    // Use weekly rate for complete weeks and daily rate for remaining days
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    totalPrice = (weeks * selectedUnitWeeklyRate) + (remainingDays * selectedUnitDailyRate);
  } else {
    totalPrice = days * selectedUnitDailyRate;
  }
  
  return {
    days,
    totalPrice: Math.round(totalPrice) // Round to nearest peso
  };
}

async function checkAvailability() {
  const startDate = document.getElementById('start_date').value;
  const endDate = document.getElementById('end_date').value;
  
  if (!startDate || !endDate) {
    document.getElementById('availability-message').innerHTML = 
      '<div class="text-red-600">Please select both check-in and check-out dates.</div>';
    return;
  }

  if (new Date(startDate) >= new Date(endDate)) {
    document.getElementById('availability-message').innerHTML = 
      '<div class="text-red-600">Check-out date must be after check-in date.</div>';
    return;
  }

  const availabilityMessage = document.getElementById('availability-message');
  const priceInfo = document.getElementById('price-info');
  availabilityMessage.innerHTML = '<div class="text-blue-600">Checking availability...</div>';
  priceInfo.classList.add('hidden');

  try {
    const response = await fetch(`/availability?unit=${selectedUnit}&start_time=${startDate}&end_time=${endDate}`);
    const data = await response.json();
    
    if (data.available) {
      const { days, totalPrice } = calculatePrice(startDate, endDate);
      availabilityMessage.innerHTML = 
        '<div class="text-green-600 mb-4">✓ Unit is available for selected dates!</div>';
      priceInfo.innerHTML = `
        <div class="text-gray-800">
          <p class="text-lg">Total for ${days} night${days > 1 ? 's' : ''}: ${totalPrice} pesos</p>
          <p class="text-sm text-gray-600 mt-1">
            ${days >= 7 ? 'Weekly rate applied where applicable' : 'Daily rate applied'}
          </p>
        </div>
      `;
      priceInfo.classList.remove('hidden');
      document.getElementById('booking-details').style.display = 'block';
    } else {
      availabilityMessage.innerHTML = 
        '<div class="text-red-600">Sorry, the unit is not available for the selected dates.</div>';
      priceInfo.classList.add('hidden');
      document.getElementById('booking-details').style.display = 'none';
    }
  } catch (error) {
    availabilityMessage.innerHTML = 
      '<div class="text-red-600">Error checking availability. Please try again.</div>';
  }
}

async function submitBooking() {
  const startDate = document.getElementById('start_date').value;
  const endDate = document.getElementById('end_date').value;
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const phone = document.getElementById('phone').value;
  const groupSize = document.getElementById('group_size').value;
  const notes = document.getElementById('notes').value;

  if (!name || !email || !groupSize) {
    alert('Please fill out all required fields.');
    return;
  }

  const { totalPrice } = calculatePrice(startDate, endDate);

  const bookingData = {
    unit: selectedUnit,
    start_time: startDate,
    end_time: endDate,
    name: name,
    email: email,
    phone: phone,
    group_size: groupSize,
    notes: notes,
    total_price: totalPrice
  };

  try {
    const response = await fetch('/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });

    if (response.ok) {
      document.getElementById('booking-details').style.display = 'none';
      document.getElementById('availability-message').style.display = 'none';
      document.getElementById('price-info').style.display = 'none';
      successMessage.style.display = 'block';
      
      // Close modal after 5 seconds
      setTimeout(() => {
        closeModal();
      }, 5000);
    } else {
      throw new Error('Failed to submit booking');
    }
  } catch (error) {
    alert('Failed to submit booking request. Please try again.');
  }
}

// Call fetchUnits and fetchSiteContent when the page loads
document.addEventListener('DOMContentLoaded', () => {
  fetchUnits();
  fetchSiteContent();
});
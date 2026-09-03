/* ===== ORDER FLOW ENHANCEMENTS ===== */

// ===== GOOGLE SHEETS ENQUIRY LOGGING =====
// STEP-BY-STEP SETUP: see GOOGLE-SHEETS-SETUP.md in this repo for full instructions.
// Replace the URL below with YOUR deployed Google Apps Script Web App URL.
const GOOGLE_SHEET_WEBHOOK_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

// Sends the enquiry to the Google Sheet (fire-and-forget, never blocks WhatsApp/Email).
// Uses mode:'no-cors' because Apps Script web apps don't return readable CORS headers —
// the request still reaches the sheet and appends the row even though we can't read the response.
function logEnquiryToSheet(data) {
  if (!GOOGLE_SHEET_WEBHOOK_URL || GOOGLE_SHEET_WEBHOOK_URL.indexOf("PASTE_YOUR") !== -1) {
    console.warn("Google Sheet webhook URL not configured yet — skipping enquiry log. See GOOGLE-SHEETS-SETUP.md");
    return;
  }
  fetch(GOOGLE_SHEET_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(data),
  }).catch((err) => {
    // Logging failure should never block the customer's WhatsApp/Email order
    console.warn("Could not log enquiry to Google Sheet:", err);
  });
}


// Field Validation Rules
const validationRules = {
  bizName: {
    minLength: 3,
    message: 'Business name must be at least 3 characters'
  },
  bizContactPerson: {
    minLength: 3,
    message: 'Contact person name must be at least 3 characters'
  },
  bizPhone: {
    pattern: /^[6-9]\d{9}$/,
    message: 'Please enter a valid 10-digit mobile number starting with 6-9'
  },
  bizLocation: {
    minLength: 5,
    message: 'Please provide a complete delivery address'
  },
  bizEmail: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
    optional: true
  }
};

// Real-time Field Validation
function validateField(fieldId) {
  const field = document.getElementById(fieldId);
  const feedback = document.getElementById(`${fieldId}-feedback`);
  const value = field.value.trim();
  const rule = validationRules[fieldId];
  
  if (!rule) return true;
  
  // Skip validation for optional empty fields
  if (rule.optional && !value) {
    field.classList.remove('field-invalid', 'field-valid');
    feedback.innerHTML = '';
    return true;
  }
  
  let isValid = true;
  let message = '';
  
  // Check required
  if (!value && !rule.optional) {
    isValid = false;
    message = 'This field is required';
  }
  // Check minLength
  else if (rule.minLength && value.length < rule.minLength) {
    isValid = false;
    message = rule.message;
  }
  // Check pattern
  else if (rule.pattern && !rule.pattern.test(value)) {
    isValid = false;
    message = rule.message;
  }
  
  // Update UI
  if (isValid) {
    field.classList.remove('field-invalid');
    field.classList.add('field-valid');
    feedback.innerHTML = '<span class="field-success">✓ Looks good!</span>';
  } else {
    field.classList.remove('field-valid');
    field.classList.add('field-invalid');
    feedback.innerHTML = `<span class="field-error">⚠ ${message}</span>`;
  }
  
  return isValid;
}

// Update Progress Bar
function updateProgress() {
  const requiredFields = ['bizName', 'bizContactPerson', 'bizPhone', 'bizLocation', 'deliveryDate'];
  const cartItems = Object.keys(cart).length;
  
  let filledFields = 0;
  requiredFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field && field.value.trim()) {
      filledFields++;
    }
  });
  
  // Add cart items to progress
  if (cartItems > 0) filledFields++;
  
  const totalSteps = requiredFields.length + 1; // +1 for cart items
  const progress = Math.round((filledFields / totalSteps) * 100);
  
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  
  if (progressBar) progressBar.style.width = `${progress}%`;
  if (progressPercent) progressPercent.textContent = `${progress}%`;
}

// Save Draft to localStorage
function saveDraft() {
  const draft = {
    bizName: document.getElementById('bizName').value,
    bizContactPerson: document.getElementById('bizContactPerson').value,
    bizPhone: document.getElementById('bizPhone').value,
    bizType: document.getElementById('bizType').value,
    bizLocation: document.getElementById('bizLocation').value,
    deliveryDate: document.getElementById('deliveryDate').value,
    bizEmail: document.getElementById('bizEmail').value,
    specialInstructions: document.getElementById('specialInstructions').value,
    cart: cart,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem('sattvaDraft', JSON.stringify(draft));
  showToast('✅ Draft saved successfully! You can load it anytime.');
}

// Load Draft from localStorage
function loadDraft() {
  const draftJson = localStorage.getItem('sattvaDraft');
  
  if (!draftJson) {
    showToast('⚠️ No saved draft found.');
    return;
  }
  
  try {
    const draft = JSON.parse(draftJson);
    
    // Confirm before loading
    if (!confirm(`Load draft from ${new Date(draft.timestamp).toLocaleString()}? Current data will be replaced.`)) {
      return;
    }
    
    document.getElementById('bizName').value = draft.bizName || '';
    document.getElementById('bizContactPerson').value = draft.bizContactPerson || '';
    document.getElementById('bizPhone').value = draft.bizPhone || '';
    document.getElementById('bizType').value = draft.bizType || '';
    document.getElementById('bizLocation').value = draft.bizLocation || '';
    document.getElementById('deliveryDate').value = draft.deliveryDate || '';
    document.getElementById('bizEmail').value = draft.bizEmail || '';
    document.getElementById('specialInstructions').value = draft.specialInstructions || '';
    
    // Restore cart
    if (draft.cart) {
      cart = draft.cart;
      renderDrawer();
      syncTextareaWithCart();
      updateCartBadges();
    }
    
    updateProgress();
    showToast('✅ Draft loaded successfully!');
  } catch (e) {
    showToast('❌ Error loading draft. It may be corrupted.');
  }
}

// Enhanced Form Submission with Preview
function handleQuoteSubmit(e) {
  e.preventDefault();
  
  // Validate all fields
  const fieldsToValidate = ['bizName', 'bizContactPerson', 'bizPhone', 'bizLocation'];
  let allValid = true;
  
  fieldsToValidate.forEach(fieldId => {
    if (!validateField(fieldId)) {
      allValid = false;
    }
  });
  
  // Check if cart is empty
  if (Object.keys(cart).length === 0) {
    showToast('⚠️ Please add at least one item to your quote!');
    document.getElementById('bizRequirements').classList.add('field-invalid');
    return;
  }
  
  if (!allValid) {
    showToast('⚠️ Please fix the errors in the form before submitting.');
    return;
  }
  
  // Show order summary modal
  showOrderSummary();
}

// Show Order Summary Modal
function showOrderSummary() {
  const modal = document.getElementById('orderSummaryModal');
  
  // Populate summary data
  const name = document.getElementById('bizName').value.trim();
  const contactPerson = document.getElementById('bizContactPerson').value.trim();
  const phone = document.getElementById('bizPhone').value.trim();
  const type = document.getElementById('bizType').value;
  const location = document.getElementById('bizLocation').value.trim();
  const deliveryDate = document.getElementById('deliveryDate').value;
  const email = document.getElementById('bizEmail').value.trim();
  const specialInstructions = document.getElementById('specialInstructions').value.trim();
  
  // Format delivery date
  const dateObj = new Date(deliveryDate);
  const formattedDate = dateObj.toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Build items list
  let itemsHTML = '';
  let itemCount = 0;
  Object.keys(cart).forEach(itemName => {
    const item = cart[itemName];
    itemCount++;
    itemsHTML += `
      <div class="summary-item">
        <div class="summary-label">${itemCount}. ${itemName}</div>
        <div class="summary-value">${item.qty} × ${item.unit}</div>
      </div>
    `;
  });
  
  // Populate modal
  document.getElementById('summaryItems').innerHTML = itemsHTML;
  document.getElementById('summaryBusiness').textContent = name;
  document.getElementById('summaryContact').textContent = contactPerson;
  document.getElementById('summaryPhone').textContent = `+91 ${phone}`;
  document.getElementById('summarySector').textContent = type;
  document.getElementById('summaryLocation').textContent = location;
  document.getElementById('summaryDeliveryDate').textContent = formattedDate;
  
  if (email) {
    document.getElementById('summaryEmailRow').style.display = 'flex';
    document.getElementById('summaryEmail').textContent = email;
  } else {
    document.getElementById('summaryEmailRow').style.display = 'none';
  }
  
  if (specialInstructions) {
    document.getElementById('summaryInstructionsRow').style.display = 'block';
    document.getElementById('summaryInstructions').textContent = specialInstructions;
  } else {
    document.getElementById('summaryInstructionsRow').style.display = 'none';
  }
  
  document.getElementById('summaryItemCount').textContent = itemCount;
  
  // Show modal
  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.add('show'), 10);
}

// Close Order Summary Modal
function closeOrderSummary() {
  const modal = document.getElementById('orderSummaryModal');
  modal.classList.remove('show');
  setTimeout(() => modal.classList.add('hidden'), 300);
}

// Submit Order via Selected Method
function submitOrder() {
  const method = document.querySelector('input[name="submitMethod"]:checked').value;
  
  const name = document.getElementById('bizName').value.trim();
  const contactPerson = document.getElementById('bizContactPerson').value.trim();
  const phone = document.getElementById('bizPhone').value.trim();
  const type = document.getElementById('bizType').value;
  const location = document.getElementById('bizLocation').value.trim();
  const deliveryDate = document.getElementById('deliveryDate').value;
  const email = document.getElementById('bizEmail').value.trim();
  const specialInstructions = document.getElementById('specialInstructions').value.trim();
  const req = document.getElementById('bizRequirements').value.trim();
  
  const dateObj = new Date(deliveryDate);
  const formattedDate = dateObj.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  // Log this enquiry to the Google Sheet — happens no matter which method (WhatsApp/Email/Copy)
  // the buyer picks, so every lead is captured in one place.
  logEnquiryToSheet({
    timestamp: new Date().toISOString(),
    businessName: name,
    contactPerson: contactPerson,
    phone: `+91 ${phone}`,
    email: email || '-',
    sector: type,
    location: location,
    deliveryDate: formattedDate,
    items: req,
    specialInstructions: specialInstructions || '-',
    submittedVia: method
  });
  
  if (method === 'whatsapp') {
    let message = `*🌶️ B2B BULK PROCUREMENT INQUIRY*%0A%0A`;
    message += `*Business Details:*%0A`;
    message += `• Name: ${name}%0A`;
    message += `• Contact: ${contactPerson}%0A`;
    message += `• Phone: +91 ${phone}%0A`;
    if (email) message += `• Email: ${email}%0A`;
    message += `• Sector: ${type}%0A`;
    message += `• Location: ${location}%0A`;
    message += `• Delivery Date: ${formattedDate}%0A%0A`;
    message += `*Configured Items:*%0A${encodeURIComponent(req)}`;
    if (specialInstructions) {
      message += `%0A%0A*Special Instructions:*%0A${encodeURIComponent(specialInstructions)}`;
    }
    
    window.open(`https://wa.me/919637515153?text=${message}`, '_blank');
    showSuccessConfirmation();
  } 
  else if (method === 'email') {
    const subject = encodeURIComponent(`Bulk Order Inquiry - ${name}`);
    let body = `Business: ${name}%0A`;
    body += `Contact Person: ${contactPerson}%0A`;
    body += `Phone: +91 ${phone}%0A`;
    if (email) body += `Email: ${email}%0A`;
    body += `Sector: ${type}%0A`;
    body += `Delivery Location: ${location}%0A`;
    body += `Delivery Date: ${formattedDate}%0A%0A`;
    body += `Items:%0A${encodeURIComponent(req)}`;
    if (specialInstructions) {
      body += `%0A%0ASpecial Instructions:%0A${encodeURIComponent(specialInstructions)}`;
    }
    
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    showSuccessConfirmation();
  }
  else if (method === 'copy') {
    let copyText = `🌶️ SATTVA INDIA - BULK ORDER INQUIRY\n\n`;
    copyText += `BUSINESS DETAILS:\n`;
    copyText += `Business: ${name}\n`;
    copyText += `Contact: ${contactPerson}\n`;
    copyText += `Phone: +91 ${phone}\n`;
    if (email) copyText += `Email: ${email}\n`;
    copyText += `Sector: ${type}\n`;
    copyText += `Location: ${location}\n`;
    copyText += `Delivery Date: ${formattedDate}\n\n`;
    copyText += `ITEMS:\n${req}`;
    if (specialInstructions) {
      copyText += `\n\nSPECIAL INSTRUCTIONS:\n${specialInstructions}`;
    }
    
    navigator.clipboard.writeText(copyText).then(() => {
      showToast('✅ Order details copied to clipboard!');
      showSuccessConfirmation();
    });
  }
}

// Show Success Confirmation
function showSuccessConfirmation() {
  closeOrderSummary();
  
  // Create success modal
  const successHTML = `
    <div id="successModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-body text-center">
          <div class="success-icon mb-4">
            <svg class="w-20 h-20 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
              <path class="success-checkmark" d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
          </div>
          
          <h3 class="text-2xl font-serif font-bold text-stone-900 mb-2">Order Submitted Successfully!</h3>
          <p class="text-stone-600 text-sm mb-6">Your wholesale inquiry has been sent to our team.</p>
          
          <div class="bg-spice-surface p-4 rounded-xl border border-stone-200 text-left mb-6">
            <h4 class="font-bold text-xs uppercase text-stone-700 mb-2">📋 Next Steps:</h4>
            <ul class="text-xs text-stone-600 space-y-1.5">
              <li>✓ Our team will review your requirements</li>
              <li>✓ You'll receive a detailed quotation within 2-4 hours</li>
              <li>✓ We'll confirm pricing, availability, and delivery schedule</li>
              <li>✓ Any questions? Call us at <strong>+91 9637515153</strong></li>
            </ul>
          </div>
          
          <div class="flex gap-3">
            <button onclick="closeSuccessModal(); location.reload();" class="flex-1 bg-spice-700 hover:bg-spice-800 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all">
              Start New Order
            </button>
            <button onclick="closeSuccessModal()" class="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold py-3 px-4 rounded-xl text-sm transition-all">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', successHTML);
  const successModal = document.getElementById('successModal');
  setTimeout(() => successModal.classList.add('show'), 10);
  
  // Clear draft after successful submission
  localStorage.removeItem('sattvaDraft');
}

function closeSuccessModal() {
  const modal = document.getElementById('successModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
}

// Initialize delivery date picker (set minimum date to today)
function initDeliveryDatePicker() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dateInput = document.getElementById('deliveryDate');
  if (dateInput) {
    dateInput.min = tomorrow.toISOString().split('T')[0];
    dateInput.value = tomorrow.toISOString().split('T')[0]; // Set default to tomorrow
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initDeliveryDatePicker();
  updateProgress();
  
  // Check if there's a saved draft
  if (localStorage.getItem('sattvaDraft')) {
    const draftIndicator = document.createElement('div');
    draftIndicator.className = 'draft-indicator mb-4';
    draftIndicator.innerHTML = '<i data-lucide="file-text" class="w-3 h-3"></i> Saved draft available';
    document.getElementById('orderForm')?.prepend(draftIndicator);
    lucide.createIcons();
  }
});

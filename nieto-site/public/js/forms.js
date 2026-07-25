/**
 * NIERO - Forms Module
 * Handles form validation, submission, and UX enhancements
 */

// ============================================================================
// FORM VALIDATION
// ============================================================================

const validationRules = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-ZÀ-ÿ\s'-]+$/,
    messages: {
      required: 'Nome é obrigatório',
      minLength: 'Nome deve ter pelo menos 2 caracteres',
      pattern: 'Nome contém caracteres inválidos'
    }
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    messages: {
      required: 'E-mail é obrigatório',
      pattern: 'E-mail inválido'
    }
  },
  phone: {
    required: false,
    pattern: /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/,
    messages: {
      pattern: 'Telefone inválido. Use: (11) 99999-9999'
    }
  },
  service: {
    required: false,
    messages: {}
  },
  message: {
    required: true,
    minLength: 10,
    maxLength: 2000,
    messages: {
      required: 'Mensagem é obrigatória',
      minLength: 'Mensagem deve ter pelo menos 10 caracteres'
    }
  }
};

/**
 * Validate a single field
 */
export function validateField(fieldName, value) {
  const rules = validationRules[fieldName];
  if (!rules) return { valid: true };
  
  const errors = [];
  
  if (rules.required && (!value || !value.trim())) {
    errors.push(rules.messages.required);
  }
  
  if (value && rules.minLength && value.trim().length < rules.minLength) {
    errors.push(rules.messages.minLength);
  }
  
  if (value && rules.maxLength && value.trim().length > rules.maxLength) {
    errors.push(rules.messages.maxLength);
  }
  
  if (value && rules.pattern && !rules.pattern.test(value.trim())) {
    errors.push(rules.messages.pattern);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate entire form
 */
export function validateForm(formData) {
  const results = {};
  let isValid = true;
  
  for (const [fieldName, value] of Object.entries(formData)) {
    const result = validateField(fieldName, value);
    results[fieldName] = result;
    if (!result.valid) isValid = false;
  }
  
  return { valid: isValid, fields: results };
}

// ============================================================================
// FORM SUBMISSION
// ============================================================================

/**
 * Submit form via AJAX
 */
export async function submitForm(form, endpoint = '/api/contact') {
  const submitBtn = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  
  // Remove honeypot field
  delete data.website;
  
  // Validate
  const validation = validateForm(data);
  if (!validation.valid) {
    showFieldErrors(form, validation.fields);
    return { success: false, errors: validation.fields };
  }
  
  // Clear previous errors
  clearErrors(form);
  
  // Show loading state
  setLoadingState(submitBtn, true);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Erro ao enviar formulário');
    }
    
    // Success
    showFormSuccess(form, result.message);
    
    // Track conversion
    trackFormSubmission(form, data);
    
    return { success: true, data: result };
    
  } catch (error) {
    console.error('Form submission error:', error);
    showFormError(form, error.message);
    return { success: false, error: error.message };
    
  } finally {
    setLoadingState(submitBtn, false);
  }
}

/**
 * Set loading state on submit button
 */
function setLoadingState(button, loading) {
  if (!button) return;
  
  const btnText = button.querySelector('.btn-text');
  const btnLoading = button.querySelector('.btn-loading');
  
  if (loading) {
    button.disabled = true;
    button.classList.add('btn--loading');
    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'inline-flex';
  } else {
    button.disabled = false;
    button.classList.remove('btn--loading');
    if (btnText) btnText.style.display = '';
    if (btnLoading) btnLoading.style.display = 'none';
  }
}

/**
 * Show field-level validation errors
 */
function showFieldErrors(form, fields) {
  Object.entries(fields).forEach(([fieldName, result]) => {
    if (!result.valid) {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (input) {
        input.classList.add('form-input-error');
        const errorEl = document.createElement('div');
        errorEl.className = 'form-error';
        errorEl.textContent = result.errors[0];
        input.parentNode.appendChild(errorEl);
      }
    }
  });
  
  // Focus first error
  const firstError = form.querySelector('.form-input-error');
  firstError?.focus();
}

/**
 * Clear all errors from form
 */
export function clearErrors(form) {
  form.querySelectorAll('.form-error').forEach(el => el.remove());
  form.querySelectorAll('.form-input-error').forEach(el => el.classList.remove('form-input-error'));
}

/**
 * Show success message
 */
function showFormSuccess(form, message) {
  // Hide form
  form.style.display = 'none';
  
  // Show success message
  const successId = form.dataset.successId || 'formSuccess';
  const successEl = document.getElementById(successId);
  
  if (successEl) {
    successEl.hidden = false;
    successEl.querySelector('p')?.textContent = message;
    successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    // Create inline success message
    const successDiv = document.createElement('div');
    successDiv.className = 'form-success-inline';
    successDiv.innerHTML = `
      <svg class="success-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <h3>Mensagem enviada!</h3>
      <p>${message}</p>
      <button type="button" class="btn btn--outline" id="sendAnother">Enviar outra mensagem</button>
    `;
    form.parentNode.insertBefore(successDiv, form);
    
    // Handle "send another" button
    successDiv.querySelector('#sendAnother')?.addEventListener('click', () => {
      successDiv.remove();
      form.reset();
      form.style.display = '';
    });
  }
}

/**
 * Show form error message
 */
function showFormError(form, message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'form-error-inline';
  errorDiv.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
    <p>${message}</p>
  `;
  form.insertBefore(errorDiv, form.firstChild);
  errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Auto-remove after 5 seconds
  setTimeout(() => errorDiv.remove(), 5000);
}

// ============================================================================
// FORM UX ENHANCEMENTS
// ============================================================================

/**
 * Initialize form enhancements (floating labels, character count, etc.)
 */
export function initFormEnhancements(form) {
  // Floating labels
  initFloatingLabels(form);
  
  // Character counter for textarea
  initCharCounter(form);
  
  // Phone mask
  initPhoneMask(form);
  
  // Real-time validation
  initRealTimeValidation(form);
}

/**
 * Floating label effect
 */
function initFloatingLabels(form) {
  form.querySelectorAll('.form-group').forEach(group => {
    const input = group.querySelector('input, textarea, select');
    const label = group.querySelector('label');
    
    if (!input || !label) return;
    
    const checkValue = () => {
      group.classList.toggle('has-value', input.value.trim() !== '');
    };
    
    // Initial check
    checkValue();
    
    // Listen for changes
    input.addEventListener('input', checkValue);
    input.addEventListener('blur', checkValue);
    input.addEventListener('change', checkValue);
  });
}

/**
 * Character counter for textarea
 */
function initCharCounter(form) {
  const textareas = form.querySelectorAll('textarea[maxlength]');
  
  textareas.forEach(textarea => {
    const maxLength = parseInt(textarea.getAttribute('maxlength'), 10);
    const counter = document.createElement('div');
    counter.className = 'char-counter';
    counter.innerHTML = `<span class="current">0</span> / ${maxLength}`;
    textarea.parentNode.appendChild(counter);
    
    const currentEl = counter.querySelector('.current');
    
    const update = () => {
      const length = textarea.value.length;
      currentEl.textContent = length;
      counter.classList.toggle('near-limit', length > maxLength * 0.8);
      counter.classList.toggle('at-limit', length >= maxLength);
    };
    
    textarea.addEventListener('input', update);
    update();
  });
}

/**
 * Phone number mask
 */
function initPhoneMask(form) {
  const phoneInput = form.querySelector('input[type="tel"]');
  if (!phoneInput) return;
  
  phoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    
    if (value.length > 10) {
      value = `${value.slice(0, 10)}-${value.slice(10)}`;
    }
    
    e.target.value = value;
  });
}

/**
 * Real-time validation on blur
 */
function initRealTimeValidation(form) {
  const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
  
  inputs.forEach(input => {
    input.addEventListener('blur', () => {
      const value = input.value;
      const result = validateField(input.name, value);
      
      if (!result.valid) {
        input.classList.add('form-input-error');
        // Remove existing error
        const existingError = input.parentNode.querySelector('.form-error');
        existingError?.remove();
        // Add new error
        const errorEl = document.createElement('div');
        errorEl.className = 'form-error';
        errorEl.textContent = result.errors[0];
        input.parentNode.appendChild(errorEl);
      } else {
        input.classList.remove('form-input-error');
        const errorEl = input.parentNode.querySelector('.form-error');
        errorEl?.remove();
      }
    });
    
    // Clear error on input
    input.addEventListener('input', () => {
      if (input.classList.contains('form-input-error')) {
        input.classList.remove('form-input-error');
        const errorEl = input.parentNode.querySelector('.form-error');
        errorEl?.remove();
      }
    });
  });
}

// ============================================================================
// ANALYTICS / TRACKING
// ============================================================================

/**
 * Track form submission for analytics
 */
function trackFormSubmission(form, data) {
  const formType = form.id || form.className || 'contact';
  
  // Google Analytics 4
  if (typeof gtag !== 'undefined') {
    gtag('event', 'form_submit', {
      form_type: formType,
      service_interest: data.service || 'not_specified',
      has_phone: !!data.phone
    });
  }
  
  // Custom event for other analytics
  window.dispatchEvent(new CustomEvent('form:submit', {
    detail: { formType, data }
  }));
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize all forms on page
 */
export function initForms() {
  const forms = document.querySelectorAll('form[data-ajax]');
  
  forms.forEach(form => {
    // Enhancements
    initFormEnhancements(form);
    
    // Submit handler
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitForm(form, form.action || '/api/contact');
    });
    
    // Reset handler
    form.addEventListener('reset', () => {
      clearErrors(form);
      form.querySelectorAll('.has-value').forEach(el => el.classList.remove('has-value'));
    });
  });
}

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initForms);
} else {
  initForms();
}
/**
 * NIERO - Mobile Menu Module
 * Handles hamburger menu toggle and mobile navigation
 */

const MOBILE_MENU_KEY = 'mobile-menu';

/**
 * Initialize mobile menu functionality
 */
export function initMobileMenu() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
  const mobileMenuClose = document.getElementById('mobileMenuClose');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
  
  if (!menuBtn || !mobileMenu) return;
  
  // Toggle menu
  menuBtn.addEventListener('click', () => {
    const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
    toggleMobileMenu(!isOpen);
  });
  
  // Close button
  mobileMenuClose?.addEventListener('click', () => toggleMobileMenu(false));
  
  // Overlay click
  mobileMenuOverlay?.addEventListener('click', () => toggleMobileMenu(false));
  
  // Close on nav link click
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => toggleMobileMenu(false));
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
      toggleMobileMenu(false);
    }
  });
  
  // Trap focus in mobile menu when open
  mobileMenu.addEventListener('keydown', trapFocus);
}

/**
 * Toggle mobile menu open/closed
 */
function toggleMobileMenu(open) {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
  
  if (!menuBtn || !mobileMenu) return;
  
  menuBtn.setAttribute('aria-expanded', open);
  mobileMenu.hidden = !open;
  mobileMenuOverlay?.setAttribute('hidden', !open);
  
  // Prevent body scroll when menu is open
  document.body.style.overflow = open ? 'hidden' : '';
  
  // Focus management
  if (open) {
    // Focus first focusable element in menu
    const firstFocusable = mobileMenu.querySelector(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    setTimeout(() => firstFocusable?.focus(), 100);
  } else {
    // Return focus to menu button
    menuBtn.focus();
  }
}

/**
 * Trap focus within mobile menu
 */
function trapFocus(e) {
  if (e.key !== 'Tab') return;
  
  const mobileMenu = document.getElementById('mobileMenu');
  if (!mobileMenu) return;
  
  const focusableElements = mobileMenu.querySelectorAll(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  if (e.shiftKey && document.activeElement === firstElement) {
    e.preventDefault();
    lastElement.focus();
  } else if (!e.shiftKey && document.activeElement === lastElement) {
    e.preventDefault();
    firstElement.focus();
  }
}

/**
 * Check if mobile menu is open
 */
export function isMobileMenuOpen() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  return menuBtn?.getAttribute('aria-expanded') === 'true';
}
/**
 * NIERO - Main Entry Point
 * Initializes all modules and handles global functionality
 */

import { initTheme, toggleTheme } from './theme.js';
import { initMobileMenu } from './mobile-menu.js';
import { initAnimations, initCounterAnimations, addStaggerAnimations } from './animations.js';
import { applyTranslations, setLanguage, getCurrentLanguage } from './i18n.js';
import { initForms } from './forms.js';

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize core modules
  initTheme();
  initMobileMenu();
  
  // Initialize i18n
  const savedLang = getCurrentLanguage();
  setLanguage(savedLang);
  applyTranslations();
  
  // Initialize animations
  initAnimations();
  initCounterAnimations();
  addStaggerAnimations();
  
  // Initialize forms
  initForms();
  
  // Initialize language toggle buttons
  initLanguageToggle();
  
  // Initialize theme toggle button
  initThemeToggle();
  
  // Initialize header scroll effect
  initHeaderScroll();
  
  // Initialize smooth scroll for anchor links
  initSmoothScroll();
  
  // Initialize WhatsApp tracking
  initWhatsAppTracking();
  
  console.log('Niero website initialized');
});

// ============================================================================
// THEME TOGGLE INIT
// ============================================================================

function initThemeToggle() {
  const toggleBtn = document.getElementById('themeToggle');
  if (!toggleBtn) return;
  
  toggleBtn.addEventListener('click', () => {
    toggleTheme();
  });
}

// ============================================================================
// LANGUAGE TOGGLE
// ============================================================================

function initLanguageToggle() {
  const langButtons = document.querySelectorAll('.lang-btn');
  
  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (setLanguage(lang)) {
        applyTranslations();
        updateActiveLangButton(lang);
      }
    });
  });
  
  // Set initial active state
  updateActiveLangButton(getCurrentLanguage());
}

function updateActiveLangButton(activeLang) {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const isActive = btn.dataset.lang === activeLang;
    btn.classList.toggle('lang-btn--active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });
}

// ============================================================================
// HEADER SCROLL EFFECT
// ============================================================================

function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;
  
  let lastScroll = 0;
  const scrollThreshold = 100;
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > scrollThreshold) {
      header.style.boxShadow = 'var(--shadow-md)';
      header.style.background = document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'rgba(55, 52, 53, 0.95)'
        : 'rgba(255, 255, 255, 0.95)';
    } else {
      header.style.boxShadow = 'none';
      header.style.background = document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'rgba(55, 52, 53, 0.9)'
        : 'rgba(255, 255, 255, 0.9)';
    }
    
    lastScroll = currentScroll;
  }, { passive: true });
  
  // Update header on theme change
  window.addEventListener('themechange', (e) => {
    const theme = e.detail.theme;
    if (window.pageYOffset <= scrollThreshold) {
      header.style.background = theme === 'dark'
        ? 'rgba(55, 52, 53, 0.9)'
        : 'rgba(255, 255, 255, 0.9)';
    }
  });
}

// ============================================================================
// SMOOTH SCROLL
// ============================================================================

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        
        const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        // Close mobile menu if open
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu && !mobileMenu.hidden) {
          const closeBtn = document.getElementById('mobileMenuClose');
          closeBtn?.click();
        }
        
        // Update URL without page reload
        history.pushState(null, '', targetId);
      }
    });
  });
}

// ============================================================================
// WHATSAPP TRACKING
// ============================================================================

function initWhatsAppTracking() {
  document.querySelectorAll('a[href^="https://wa.me"], a[href^="https://api.whatsapp.com"]').forEach(link => {
    link.addEventListener('click', () => {
      // Track WhatsApp clicks
      if (typeof gtag !== 'undefined') {
        gtag('event', 'whatsapp_click', {
          event_category: 'contact',
          event_label: 'whatsapp',
        });
      }
      
      // Custom event
      window.dispatchEvent(new CustomEvent('whatsapp_click'));
    });
  });
}

// ============================================================================
// GLOBAL ERROR HANDLING
// ============================================================================

window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  // Could send to error tracking service (Sentry, etc.)
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  // Could send to error tracking service
});

// ============================================================================
// EXPORTS FOR TESTING/DEBUGGING
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initTheme,
    toggleTheme,
    initMobileMenu,
    initAnimations,
    initCounterAnimations,
    applyTranslations,
    setLanguage,
    getCurrentLanguage,
  };
}
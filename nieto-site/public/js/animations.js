/**
 * NIERO - Animations Module
 * Handles scroll-triggered animations using IntersectionObserver
 */

// Animation classes
const ANIMATION_CLASSES = {
  'fade-in': 'animate-fade-in',
  'slide-up': 'animate-slide-up',
  'slide-down': 'animate-slide-down',
  'slide-left': 'animate-slide-left',
  'slide-right': 'animate-slide-right',
  'scale-in': 'animate-scale-in',
  'rotate-in': 'animate-rotate-in',
};

// Counter animation selector
const COUNTER_SELECTOR = '[data-count]';

/**
 * Initialize scroll animations
 */
export function initAnimations() {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    // Show all animated elements immediately
    document.querySelectorAll('[class*="animate-"]').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }
  
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.1,
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Observe all elements with animation classes
  document.querySelectorAll('[class*="animate-"]').forEach(el => {
    observer.observe(el);
  });
}

/**
 * Initialize counter animations for stats
 */
export function initCounterAnimations() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    // Set final values immediately
    document.querySelectorAll(COUNTER_SELECTOR).forEach(counter => {
      counter.textContent = formatNumber(counter.dataset.count);
    });
    return;
  }
  
  const counters = document.querySelectorAll(COUNTER_SELECTOR);
  if (!counters.length) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
  const target = parseInt(element.dataset.count, 10);
  const duration = 2000; // 2 seconds
  const startTime = performance.now();
  
  function updateCounter(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-out)
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(target * easedProgress);
    
    element.textContent = formatNumber(current);
    
    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      element.textContent = formatNumber(target);
    }
  }
  
  requestAnimationFrame(updateCounter);
}

function formatNumber(num) {
  return num.toLocaleString('pt-BR');
}

/**
 * Add staggered animations to grid items
 */
export function addStaggerAnimations() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;
  
  const gridSelectors = [
    '.services-grid',
    '.portfolio-grid',
    '.value-list',
    '.hero-stats',
    '.footer-grid',
  ];
  
  gridSelectors.forEach(selector => {
    const grids = document.querySelectorAll(selector);
    grids.forEach(grid => {
      const items = grid.children;
      Array.from(items).forEach((item, index) => {
        item.style.setProperty('--stagger-index', index);
        item.classList.add('stagger-item');
      });
    });
  });
}

/**
 * Re-initialize animations (useful for dynamically added content)
 */
export function refreshAnimations() {
  initAnimations();
  initCounterAnimations();
  addStaggerAnimations();
}
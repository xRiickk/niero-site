/**
 * NIERO - Theme Management Module
 * Handles dark/light mode toggle with localStorage persistence
 */

const THEME_KEY = 'niero-theme';
const DARK_CLASS = 'dark';
const LIGHT_CLASS = 'light';

/**
 * Initialize theme based on saved preference or system preference
 */
export function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  let theme;
  if (savedTheme) {
    theme = savedTheme;
  } else {
    theme = prefersDark ? DARK_CLASS : LIGHT_CLASS;
  }
  
  applyTheme(theme);
  updateThemeToggle(theme);
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
      const newTheme = e.matches ? DARK_CLASS : LIGHT_CLASS;
      applyTheme(newTheme);
      updateThemeToggle(newTheme);
    }
  });
}

/**
 * Toggle between light and dark theme
 */
export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || LIGHT_CLASS;
  const newTheme = currentTheme === DARK_CLASS ? LIGHT_CLASS : DARK_CLASS;
  
  applyTheme(newTheme);
  updateThemeToggle(newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
  
  // Dispatch custom event for other components
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }));
}

/**
 * Apply theme to document
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.content = theme === DARK_CLASS ? '#373435' : '#F0F0F0';
  }
}

/**
 * Update theme toggle button state
 */
function updateThemeToggle(theme) {
  const toggleBtn = document.getElementById('themeToggle');
  if (!toggleBtn) return;
  
  const isDark = theme === DARK_CLASS;
  toggleBtn.setAttribute('aria-pressed', isDark);
  toggleBtn.setAttribute('aria-label', isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro');
  
  // Update icons (CSS handles visibility)
  toggleBtn.classList.toggle('theme-toggle--dark', isDark);
}

/**
 * Get current theme
 */
export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || LIGHT_CLASS;
}

/**
 * Set specific theme
 */
export function setTheme(theme) {
  if (theme !== DARK_CLASS && theme !== LIGHT_CLASS) return false;
  
  applyTheme(theme);
  updateThemeToggle(theme);
  localStorage.setItem(THEME_KEY, theme);
  
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  return true;
}
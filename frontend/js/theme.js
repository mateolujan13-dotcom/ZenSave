(function() {
  var saved = localStorage.getItem('zen_theme') || 'dark';
  document.documentElement.classList.toggle('dark', saved === 'dark');
  document.documentElement.classList.toggle('light', saved === 'light');
})();

function toggleTheme() {
  var isDark = document.documentElement.classList.toggle('dark');
  document.documentElement.classList.toggle('light', !isDark);
  localStorage.setItem('zen_theme', isDark ? 'dark' : 'light');
  var icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
}

window.toggleTheme = toggleTheme;

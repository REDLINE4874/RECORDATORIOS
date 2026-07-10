document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.createElement('button');
  toggle.id = 'theme-toggle';
  toggle.type = 'button';
  toggle.className = 'theme-toggle';
  toggle.setAttribute('aria-label', 'Cambiar modo');
  toggle.textContent = '🌙';

  const navbar = document.querySelector('.navbar');
  const tabs = document.querySelector('.tabs');
  if (navbar && tabs) {
    navbar.appendChild(toggle);
  } else if (navbar) {
    navbar.appendChild(toggle);
  } else {
    document.body.prepend(toggle);
  }

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    toggle.textContent = '☀️';
  }

  toggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    toggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
});

// Put code for leaderboard UI here and export it so it can be used in index.ts

// Example:
// export function loginInfo(container: HTMLElement) {
//   container.innerHTML = '<h2>login</h2><p>Coming soon!</p>';
//   // Add login rendering logic here
// }


//Initializes the dark/light mode toggle button logic.
export function setupDarkModeToggle(buttonId: string = 'toggleDark') {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  function isDark() {
    return document.documentElement.classList.contains('dark');
  }
  function setDark(enabled: boolean) {
    document.documentElement.classList.toggle('dark', enabled);
	//saves prefernce so it persists with page reloads
    localStorage.setItem('theme', enabled ? 'dark' : 'light');
    updateButton();
  }
  function updateButton() {
	//Button text flips depending on current theme
	//if in darkmode (isDark() == true) --> shows "Light Mode"
	//if not --> shows "Dark Mode"
    btn!.textContent = isDark() ? 'Light Mode' : 'Dark Mode';
    btn!.setAttribute('aria-pressed', String(isDark()));
  }

  updateButton();
  btn.addEventListener('click', () => setDark(!isDark()));
}

//Applies the saved theme preference on page load.
export function applySavedTheme() {
  try {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	//if saved is dark, save prefersDark as shouldDark
    const shouldDark = saved ? saved === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', shouldDark);
  } catch (_) {}
}

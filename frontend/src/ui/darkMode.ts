//ui/darkMode

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
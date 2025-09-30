//ui/views

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


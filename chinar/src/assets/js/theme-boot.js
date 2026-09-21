/* Runs before first paint (blocking, tiny) so the saved theme never flashes. */
try {
  var saved = localStorage.getItem('chinar:theme');
  if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
} catch (e) { /* storage blocked */ }

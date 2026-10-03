/** Blinks the tab title until the tab is visible again — works even where system notifications are blocked. */
let timer: number | null = null;

export function blinkTitle(message: string) {
  if (typeof document === "undefined" || !document.hidden) return;
  const original = document.title;
  let on = false;
  if (timer) window.clearInterval(timer);
  timer = window.setInterval(() => {
    on = !on;
    document.title = on ? message : original;
  }, 1000);
  const stop = () => {
    if (document.hidden) return;
    if (timer) window.clearInterval(timer);
    timer = null;
    document.title = original;
    document.removeEventListener("visibilitychange", stop);
  };
  document.addEventListener("visibilitychange", stop);
}

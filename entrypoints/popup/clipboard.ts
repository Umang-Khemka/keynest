export const CLIPBOARD_CLEAR_SECONDS = 30;

let clearTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Copies a secret and clears the clipboard after CLIPBOARD_CLEAR_SECONDS.
 *
 * Limitation: the timer lives in the popup, so it only fires while the popup
 * is open. Clearing after the popup closes needs a background helper
 * (an offscreen document in Chrome) and is a follow-up task.
 */
export async function copySecret(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
  clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    navigator.clipboard.writeText('').catch(() => {
      // The popup may have lost focus; nothing else we can do here.
    });
  }, CLIPBOARD_CLEAR_SECONDS * 1000);
}

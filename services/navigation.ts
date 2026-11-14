import { browser } from 'wxt/browser';

/**
 * Opens the Backup & settings page in a full tab. File pickers are unreliable
 * inside extension popups (the popup closes when the dialog opens in Firefox
 * and in Chrome on macOS/Linux), so all file handling lives on that page.
 */
export async function openManagePage(): Promise<void> {
  await browser.tabs.create({ url: browser.runtime.getURL('/manage.html') });
  window.close();
}

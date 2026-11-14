import { AUTO_LOCK_ALARM, enforceAutoLock } from '@/services/vault-store';

export default defineBackground(() => {
  // In MV3 this worker can be terminated at any time, so it keeps no state in
  // memory (Project.md section 5.4). Never log credentials or key material.
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === AUTO_LOCK_ALARM) void enforceAutoLock();
  });
});

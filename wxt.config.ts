import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // Use Manifest V3 for every browser (WXT defaults Firefox to MV2) so the
  // service-worker lifecycle rules in Project.md section 5.4 apply everywhere.
  manifestVersion: 3,
  manifest: {
    name: 'KeyNest',
    description:
      'A secure, local-first password manager that detects password changes.',
    // Keep permissions minimal. Add each permission only when the feature that
    // needs it is implemented, and document why in docs/security.md.
    permissions: [],
    browser_specific_settings: {
      gecko: {
        // TODO: replace with the final add-on ID before publishing to AMO.
        id: 'keynest@example.com',
        // KeyNest never collects or transmits user data.
        data_collection_permissions: { required: ['none'] },
      },
    },
  },
});

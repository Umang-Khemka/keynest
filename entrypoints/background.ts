export default defineBackground(() => {
  // Phase 1 will hold vault state here. Remember: in MV3 this worker can be
  // terminated at any time, so never rely on in-memory state surviving.
  // See Project.md section 5.4. Never log credentials or key material.
});

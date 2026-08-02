// Copy this file to js/env.local.js (gitignored) to point your local
// checkout at the test sheet's Apps Script Web App URL instead of prod.
// submit.js loads env.local.js first and falls back to env.js when it's
// not present.
export const ENV = {
  SUBMISSION_ENDPOINT: "https://script.google.com/macros/s/PASTE_TEST_DEPLOYMENT_ID/exec",
};

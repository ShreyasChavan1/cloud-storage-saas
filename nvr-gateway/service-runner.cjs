const path = require('node:path');

process.chdir(__dirname);

(async () => {
  try {
    await import('./dist/index.js');
  } catch (err) {
    console.error('Nimbus NVR Gateway service failed to start:', err);
    process.exitCode = 1;
  }
})();

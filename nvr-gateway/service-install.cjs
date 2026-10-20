const path = require('node:path');
const { Service } = require('node-windows');

const action = (process.argv[2] || 'install').toLowerCase();
const serviceName = 'Nimbus NVR Gateway';
const service = new Service({
  name: serviceName,
  description: 'DVT Solutions CCTV/NVR gateway. Runs in the background and uploads camera recordings to DVT Solutions.',
  script: path.join(__dirname, 'service-runner.cjs'),
  workingDirectory: __dirname,
  wait: 2,
  grow: 0.5,
  maxRestarts: 20,
});

if (action === 'uninstall') {
  service.on('uninstall', () => {
    console.log('DVT Solutions NVR Gateway service removed.');
    process.exit(0);
  });
  service.on('error', err => { console.error(err); process.exit(1); });
  service.uninstall();
} else if (action === 'start') {
  service.on('start', () => { console.log('DVT Solutions NVR Gateway started.'); process.exit(0); });
  service.on('error', err => { console.error(err); process.exit(1); });
  service.start();
} else if (action === 'stop') {
  service.on('stop', () => { console.log('DVT Solutions NVR Gateway stopped.'); process.exit(0); });
  service.on('error', err => { console.error(err); process.exit(1); });
  service.stop();
} else {
  service.on('install', () => {
    console.log('DVT Solutions NVR Gateway service installed.');
    service.start();
  });
  service.on('alreadyinstalled', () => {
    console.log('DVT Solutions NVR Gateway service already installed.');
    service.start();
  });
  service.on('start', () => {
    console.log('DVT Solutions NVR Gateway service started.');
    process.exit(0);
  });
  service.on('error', err => { console.error(err); process.exit(1); });
  service.install();
}

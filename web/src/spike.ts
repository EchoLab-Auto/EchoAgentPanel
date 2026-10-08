//! 临时 spike：验证 IWER + three.js WebXR 会话在无头 Chromium 下可跑通。
import * as THREE from 'three';
import { XRDevice, metaQuest3 } from 'iwer';

declare global {
  interface Window {
    __spike: Record<string, unknown>;
  }
}
window.__spike = { supported: null, started: false, frames: 0, error: null, ended: false };

try {
  const device = new XRDevice(metaQuest3);
  device.installRuntime({ forceInstall: true });
} catch (e) {
  window.__spike.initError = String(e);
}

(async () => {
  try {
    window.__spike.supported = await navigator.xr?.isSessionSupported('immersive-vr');
  } catch (e) {
    window.__spike.supportError = String(e);
  }
})();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(320, 200);
document.body.appendChild(renderer.domElement);
renderer.xr.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101418);
const camera = new THREE.PerspectiveCamera();
const mesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.4, 0.4),
  new THREE.MeshBasicMaterial({ color: 0x4c9aff }),
);
mesh.position.set(0, 1.5, -1.5);
scene.add(mesh);

renderer.setAnimationLoop(() => {
  (window.__spike.frames as number)++;
  mesh.rotation.y += 0.01;
  renderer.render(scene, camera);
});

document.getElementById('go')!.addEventListener('click', async () => {
  try {
    const session = await navigator.xr!.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
    await renderer.xr.setSession(session);
    window.__spike.started = true;
    window.__spike.isPresenting = renderer.xr.isPresenting;
    session.addEventListener('end', () => {
      window.__spike.ended = true;
    });
  } catch (e) {
    window.__spike.error = String(e);
  }
});

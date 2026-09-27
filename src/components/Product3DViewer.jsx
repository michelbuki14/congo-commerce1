import React, { useEffect, useRef, useState } from 'react';
import { Box } from 'lucide-react';
import { Image } from '@/components/ui/image';

/**
 * 3D product viewer (experience layer, never mandatory).
 * - No model URL -> renders the standard photo (caller should skip mounting).
 * - Load or WebGL failure -> falls back to the photo, never a blank canvas.
 * - prefers-reduced-motion -> static first frame, no auto-rotate.
 * three.js is lazy-imported so the main bundle stays untouched.
 */
export default function Product3DViewer({ modelUrl, fallbackImage, title }) {
  const mountRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!modelUrl) return;
    let cancelled = false;
    let renderer = null;
    let raf = 0;
    const disposables = [];

    (async () => {
      try {
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
        const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
        if (cancelled || !mountRef.current) return;

        const mount = mountRef.current;
        const w = mount.clientWidth || 400;
        const h = mount.clientHeight || 400;
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
        camera.position.set(0, 0.6, 3.2);
        scene.add(new THREE.AmbientLight(0xffffff, 1.1));
        const key = new THREE.DirectionalLight(0xffffff, 1.4);
        key.position.set(2, 3, 4);
        scene.add(key);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.minDistance = 1.2;
        controls.maxDistance = 8;
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        controls.autoRotate = !reduced;
        controls.autoRotateSpeed = 1.2;

        await new Promise((resolve, reject) => {
          new GLTFLoader().load(
            modelUrl,
            (gltf) => {
              if (cancelled) return;
              scene.add(gltf.scene);
              const box = new THREE.Box3().setFromObject(gltf.scene);
              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3()).length() || 1;
              gltf.scene.position.sub(center);
              camera.position.set(0, size * 0.25, size * 1.4);
              gltf.scene.traverse((o) => {
                if (o.geometry) disposables.push(o.geometry);
                if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => disposables.push(m));
              });
              resolve();
            },
            undefined,
            reject,
          );
        });
        if (cancelled) return;
        setLoading(false);

        const loop = () => {
          if (cancelled) return;
          controls.update();
          renderer.render(scene, camera);
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      disposables.forEach((d) => d?.dispose?.());
      if (renderer) {
        renderer.dispose();
        renderer.domElement?.remove();
        renderer = null;
      }
    };
  }, [modelUrl]);

  if (!modelUrl || failed) {
    return <Image src={fallbackImage} alt={title} className="h-full w-full object-cover" />;
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" role="img" aria-label={`Vue 3D — ${title}`} />
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary">
          <Box className="h-6 w-6 animate-pulse text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Chargement de la vue 3D…</p>
        </div>
      )}
    </div>
  );
}

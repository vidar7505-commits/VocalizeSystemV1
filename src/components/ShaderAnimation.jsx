import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ShaderAnimation({ className }) {
  const containerRef = useRef(null);
  const sceneRef = useRef({
    camera: null,
    scene: null,
    renderer: null,
    uniforms: null,
    animationId: null,
    geometry: null,
    material: null,
    mesh: null,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    // Vertex Shader
    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    // Fragment Shader - Teal/Orange animated waves
    const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / resolution.y;
        uv.y -= 0.35; // Shift center up to be behind the text
        float t = time * 0.05;
        float lineWidth = 0.002;

        vec3 color = vec3(0.0);
        
        // Teal (#14b8a6) wave effect
        float teal = sin(t + length(uv) * 3.0) * 0.5 + 0.5;
        color.x = teal * 0.08; // R
        color.y = teal * 0.72; // G
        color.z = teal * 0.65; // B
        
        // Orange (#f97316) accents
        for(int j = 0; j < 3; j++){
          for(int i = 0; i < 5; i++){
            float wave = lineWidth * float(i * i) / abs(
              fract(t - 0.01 * float(j) + float(i) * 0.01) * 5.0 
              - length(uv) + mod(uv.x + uv.y, 0.2)
            );
            color += wave * vec3(0.97, 0.45, 0.09); // Orange overlay
          }
        }
        
        // Fade out at edges
        float fadeEdge = 1.0 - smoothstep(1.0, 4.0, length(uv));
        color *= fadeEdge;
        
        gl_FragColor = vec4(color, 0.6);
      }
    `;

    // Initialize Three.js scene
    const camera = new THREE.Camera();
    camera.position.z = 1;

    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      time: { value: 1.0 },
      resolution: { value: new THREE.Vector2() },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // Transparent background

    container.appendChild(renderer.domElement);

    // Handle window resize
    const onWindowResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      uniforms.resolution.value.x = renderer.domElement.width;
      uniforms.resolution.value.y = renderer.domElement.height;
    };

    // Initial resize
    onWindowResize();
    window.addEventListener("resize", onWindowResize, false);

    // Animation loop
    let animationId = null;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      uniforms.time.value += 0.016; // ~60fps delta
      renderer.render(scene, camera);

      if (sceneRef.current) {
        sceneRef.current.animationId = animationId;
      }
    };

    animate();

    // Store references for cleanup
    sceneRef.current = {
      camera,
      scene,
      renderer,
      uniforms,
      animationId,
      geometry,
      material,
      mesh,
    };

    // Cleanup on unmount
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      window.removeEventListener("resize", onWindowResize);

      if (sceneRef.current) {
        sceneRef.current.geometry.dispose();
        sceneRef.current.material.dispose();
        sceneRef.current.renderer.dispose();

        if (container && sceneRef.current.renderer.domElement.parentNode === container) {
          container.removeChild(sceneRef.current.renderer.domElement);
        }
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className || "absolute inset-0 w-full h-full z-0 overflow-hidden"}
      style={{
        willChange: "transform"
      }}
    />
  );
}

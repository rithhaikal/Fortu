// src/Experience/Experience.jsx
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useGLTF,
  useCursor,
  useAnimations,
  AdaptiveDpr,
  PerformanceMonitor,
  useTexture,
} from "@react-three/drei";
import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as THREE from "three";
import LuckyDrawControls from "../components/LuckyDrawControls";

/* ───────────── themes & picker ───────────── */
const THEMES = [
  { key: "cream", label: "Cream", body: "#FFF4B5", bg: "#fff8cc" },
  { key: "mint", label: "Mint", body: "#c8f5e6", bg: "#eafff6" },
  { key: "cherry", label: "Cherry", body: "#FFABDB", bg: "#ffc2e1ff" },
];

function ThemePicker({ themes, current, onChange }) {
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 24,
        transform: "translateX(-50%)",
        display: "flex",
        gap: 12,
        zIndex: 20,
        pointerEvents: "auto",
      }}
    >
      {themes.map((t) => {
        const selected = current === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            aria-label={`Theme ${t.label}`}
            title={t.label}
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              border: selected
                ? "3px solid #fff"
                : "2px solid rgba(255,255,255,.8)",
              boxShadow: "0 6px 18px rgba(0,0,0,.25)",
              background: t.body,
              outline: "none",
              cursor: "pointer",
              transform: selected ? "scale(1.05)" : "scale(1)",
              transition: "transform .15s ease, border .15s ease",
            }}
          />
        );
      })}
    </div>
  );
}

/* ───────────── utils ───────────── */
const { clamp, damp } = THREE.MathUtils;

const cryptoRandomIndex = (n) => {
  if (n <= 0) return 0;
  const lim = Math.floor((0xffffffff + 1) / n) * n;
  const buf = new Uint32Array(1);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] < lim) return buf[0] % n;
  }
};

const parseEntriesText = (t) =>
  t
    .split(/[\s,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

function parsePrizesText(t) {
  return t
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      let name = line,
        qty = 1;
      const m =
        line.match(/^(.*?)[\s]*[xX]\s*([0-9]+)\s*$/) ||
        line.match(/^(.*?)\s*[,|\-]\s*([0-9]+)\s*$/);
      if (m) {
        name = m[1].trim();
        qty = parseInt(m[2], 10) || 1;
      }
      return { name, qty: Math.max(1, qty) };
    });
}

function drawPrize(list) {
  const total = list.reduce((s, p) => s + p.qty, 0);
  if (!total) return { prizeName: null, nextPrizes: list };

  let k = cryptoRandomIndex(total);
  const next = list.map((p) => ({ ...p }));
  for (const p of next) {
    if (k < p.qty) {
      p.qty -= 1;
      return { prizeName: p.name, nextPrizes: next.filter((x) => x.qty > 0) };
    }
    k -= p.qty;
  }
  return { prizeName: next.at(-1)?.name ?? null, nextPrizes: next };
}

/* ───────────── DigitBurst (overlay) ───────────── */
const DIGIT_BURST_CSS_ID = "digit-burst-css";
const DIGIT_BURST_CSS = `
:root { --burst-out-ms: 280ms; }
@keyframes digit-in { 0%{transform:translate(-50%,-50%) scale(.6);opacity:0;}
60%{opacity:1;} 100%{transform:translate(calc(-50% + var(--x,0px)), calc(-50% - var(--rise,120px))) scale(1);opacity:1;} }
@keyframes prize-in { from{opacity:0;transform:translate(-50%,-40%);} to{opacity:1;transform:translate(-50%,-50%);} }
.burst-wrap { position:fixed; left:50%; top:50%; transform:translate(calc(-50% + var(--parx,0px)), calc(-50% + var(--pary,0px))); pointer-events:none; z-index:9999; will-change:transform,opacity; }
.burst-wrap.closing { animation: burst-out var(--burst-out-ms) ease both; }
@keyframes burst-out { to { transform: translate(calc(-50% + var(--parx,0px)), calc(-60% + var(--pary,0px))); opacity:0; } }
.digit-char { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); font-weight:800; line-height:1; white-space:pre; pointer-events:none; font-size:clamp(28px,7vw,72px); text-shadow:0 4px 12px rgba(0,0,0,.25); animation:digit-in 700ms cubic-bezier(.2,.7,.2,1) both; }
.burst-prize { position:absolute; left:50%; top:calc(50% - var(--rise,120px) + var(--prize-offset,40px)); transform:translate(-50%,-50%); pointer-events:none; white-space:nowrap; color:#fff; font-weight:700; text-shadow:0 3px 10px rgba(0,0,0,.25); opacity:0; animation:prize-in 400ms ease both; animation-delay: var(--prize-delay,0ms); }
.burst-close { position:absolute; left:calc(50% + var(--close-dx,100px)); top:calc(50% - var(--rise,120px) + var(--close-dy,-12px)); transform:translate(-50%,-50%); pointer-events:auto; user-select:none; cursor:pointer; font-size:14px; font-weight:700; line-height:1; padding:8px 10px; border-radius:999px; border:0; background:rgba(0,0,0,.55); color:#fff; box-shadow:0 6px 16px rgba(0,0,0,.25); }
.burst-close:active { transform:translate(-50%,-50%) scale(.98); }
`;

function ensureDigitBurstCSS() {
  if (!document.getElementById(DIGIT_BURST_CSS_ID)) {
    const el = document.createElement("style");
    el.id = DIGIT_BURST_CSS_ID;
    el.textContent = DIGIT_BURST_CSS;
    document.head.appendChild(el);
  }
}

function DigitBurst({
  text = "404",
  delay = 140,
  digitDur = 700,
  rise = 140,
  spacing = 28,
  size = 72,
  parallax = { x: 0, y: 0 },
  parallaxStrength = 16,
  closeDX = 120,
  closeDY = -16,
  prizeText,
  prizeOffset = 40,
  prizeSize = 22,
  prizeDelayExtra = 100,
  onClosed,
}) {
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);

  useEffect(() => {
    ensureDigitBurstCSS();
    return () => closeTimer.current && clearTimeout(closeTimer.current);
  }, []);

  const chars = [...String(text)];
  const handleClose = () => {
    setClosing(true);
    closeTimer.current = setTimeout(() => onClosed?.(), 300);
  };

  const sizeCss = typeof size === "number" ? `${size}px` : size;
  const parx = (parallax?.x || 0) * parallaxStrength;
  const pary = (parallax?.y || 0) * parallaxStrength;
  const prizeDelayMs = Math.max(
    0,
    (chars.length - 1) * delay + digitDur + prizeDelayExtra,
  );

  return (
    <div
      className={`burst-wrap${closing ? " closing" : ""}`}
      style={{
        "--rise": `${rise}px`,
        "--parx": `${parx}px`,
        "--pary": `${pary}px`,
        "--close-dx": `${closeDX}px`,
        "--close-dy": `${closeDY}px`,
        "--prize-offset": `${prizeOffset}px`,
        "--prize-delay": `${prizeDelayMs}ms`,
      }}
    >
      {chars.map((ch, i) => {
        const x = (i - (chars.length - 1) / 2) * spacing;
        return (
          <span
            key={i}
            className="digit-char"
            style={{
              animationDelay: `${i * delay}ms`,
              "--x": `${x}px`,
              fontSize: sizeCss,
              animationDuration: `${digitDur}ms`,
            }}
          >
            {ch}
          </span>
        );
      })}

      {!!prizeText && (
        <div
          className="burst-prize"
          style={{
            fontSize:
              typeof prizeSize === "number" ? `${prizeSize}px` : prizeSize,
          }}
        >
          You have won {prizeText}
        </div>
      )}

      <button className="burst-close" onClick={handleClose} aria-label="Close">
        ✕
      </button>
    </div>
  );
}

/* ───────────── center-fit camera base ───────────── */
function useCenterAndBase(rootRef, { mobile = false } = {}) {
  const { camera } = useThree();
  const base = useRef({
    ready: false,
    target: new THREE.Vector3(),
    baseY: 0,
    radius: 5,
    theta: 0,
    phi: Math.PI / 3,
  });

  const IGNORE = /^(ground|plane|floor)$/i;
  const START_PHI = Math.PI / 2.3;
  const DIST = { desktop: 1.5, mobile: 2.1 };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const box = new THREE.Box3();
    let got = false;

    root.traverse((o) => {
      if (o.isMesh && !IGNORE.test(o.name || "") && !o.userData?.ignoreBounds) {
        got ? box.expandByObject(o) : (box.setFromObject(o), (got = true));
      }
    });

    if (!got) box.setFromObject(root);

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const fit =
      Math.max(size.x, size.y, size.z) /
      (2 * Math.tan((camera.fov * Math.PI) / 360));
    const dist = fit * (mobile ? DIST.mobile : DIST.desktop);

    const pos = new THREE.Vector3()
      .setFromSpherical(new THREE.Spherical(dist, START_PHI, 0))
      .add(center);

    camera.position.copy(pos);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 100;
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    base.current = {
      ready: true,
      target: center.clone(),
      baseY: box.min.y,
      radius: dist,
      theta: 0,
      phi: START_PHI,
    };
  }, [camera, rootRef, mobile]);

  return base;
}

/* ───────────── machine (model + logic) ───────────── */
function Machine({
  onZoomKick,
  registerReset,
  isZoomed,
  onSimStarted,
  onSimFinished,
  shadowsOn,
  bodyColor,
}) {
  const { scene, animations } = useGLTF("/machine.glb");
  const rootRef = useRef();
  const { actions, clips, mixer } = useAnimations(animations, rootRef);

  // assets
  const bakedShadow = useTexture("/Shadows.png");
  useEffect(() => {
    if (!bakedShadow) return;
    bakedShadow.flipY = false;
    bakedShadow.wrapS = bakedShadow.wrapT = THREE.ClampToEdgeWrapping;
    bakedShadow.anisotropy = 4;
    "colorSpace" in bakedShadow
      ? (bakedShadow.colorSpace = THREE.LinearSRGBColorSpace)
      : (bakedShadow.encoding = THREE.LinearEncoding);
    bakedShadow.needsUpdate = true;
  }, [bakedShadow]);

  // cached lookups
  const leverRef = useRef();
  const glassMeshesRef = useRef([]); // Mesh[]
  const groundMeshesRef = useRef([]); // Mesh[]
  const shadowableMeshesRef = useRef([]); // Mesh[] (not glass/ground)
  const bodyMatsRef = useRef([]); // Material[]
  const goldenMatsRef = useRef([]); // Material[]

  // one-time traversal to categorize meshes/materials
  useEffect(() => {
    if (!scene) return;

    const seenBody = new Set();
    const seenGolden = new Set();
    const tmpGlass = [];
    const tmpGround = [];
    const tmpShadowable = [];

    const trySetLever = (o) => {
      if (leverRef.current) return;
      if (
        o.name === "LeverNew" ||
        o.userData?.tag === "lever" ||
        /lever/i.test(o.name || "")
      ) {
        leverRef.current = o;
      }
    };

    scene.traverse((o) => {
      if (o.isMesh) {
        const name = (o.name || "").toLowerCase();
        const mname = (o.material?.name || "").toLowerCase();

        const isGround =
          name.includes("ground") ||
          name.includes("floor") ||
          name.includes("plane") ||
          o.userData?.tag === "ground" ||
          mname.includes("ground") ||
          mname.includes("floor");

        const isGlass = Array.isArray(o.material)
          ? o.material.some((mm) => (mm?.name || "") === "Glass")
          : (o.material?.name || "") === "Glass";

        if (isGround) tmpGround.push(o);
        else if (isGlass) tmpGlass.push(o);
        else tmpShadowable.push(o);

        // collect body materials (case-insensitive)
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (!m) return;
          const nm = (m.name || "").toLowerCase();
          if (nm === "body" && !seenBody.has(m.uuid)) {
            seenBody.add(m.uuid);
            bodyMatsRef.current.push(m);
          }
          if (m.name === "GoldenBall" && !seenGolden.has(m.uuid)) {
            seenGolden.add(m.uuid);
            goldenMatsRef.current.push(m);
          }
        });
      }
      trySetLever(o);
    });

    glassMeshesRef.current = tmpGlass;
    groundMeshesRef.current = tmpGround;
    shadowableMeshesRef.current = tmpShadowable;
  }, [scene]);

  // apply ground overlay once texture is ready
  useEffect(() => {
    if (!bakedShadow) return;
    const overlay = new THREE.MeshBasicMaterial({
      map: bakedShadow,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      color: 0xffffff,
      opacity: 0.15,
    });
    groundMeshesRef.current.forEach((mesh) => {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.material = overlay;
    });
  }, [bakedShadow]);

  // configure glass (front-side, roughness, etc.)
  useEffect(() => {
    glassMeshesRef.current.forEach((mesh) => {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.renderOrder = 10;

      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      mats.forEach((m) => {
        if (!m) return;
        m.side = THREE.FrontSide;
        m.transparent = true;
        m.opacity = 0.75;
        m.depthWrite = false;
        m.color?.set("#ffffff");
        if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
          m.roughness = 0.1;
          m.metalness = 0.0;
        }
        m.needsUpdate = true;
      });
    });
  }, []);

  // toggle shadow flags on non-glass/ground meshes when shadowsOn changes
  useEffect(() => {
    shadowableMeshesRef.current.forEach((mesh) => {
      mesh.castShadow = !!shadowsOn;
      mesh.receiveShadow = !!shadowsOn;
    });
  }, [shadowsOn]);

  // theme body color
  useEffect(() => {
    if (!bodyColor) return;
    bodyMatsRef.current.forEach((m) => {
      m.color?.set(bodyColor);
      m.needsUpdate = true;
    });
  }, [bodyColor]);

  // Golden ball color cycler
  const palette = useRef(["#ffef9a", "#cfd8ff", "#f2d6ff"]);
  const goldenIdx = useRef(-1);
  const setNextGoldenColor = useCallback(() => {
    if (!goldenMatsRef.current.length) return;
    let next = Math.floor(Math.random() * palette.current.length);
    if (palette.current.length > 1 && next === goldenIdx.current)
      next = (next + 1) % palette.current.length;
    goldenIdx.current = next;
    const hex = palette.current[next];
    goldenMatsRef.current.forEach((m) => {
      m.color?.set(hex);
      if (m.emissive) {
        m.emissive.set(hex);
        m.emissiveIntensity = 0.0;
      }
      m.needsUpdate = true;
    });
  }, []);

  // choose clip (prefer Sims or PotongSims, else longest)
  const clipName = useMemo(() => {
    if (!clips?.length) return null;
    const pref =
      clips.find((c) => c.name === "Sims") ||
      clips.find((c) => c.name === "PotongSims");
    return (pref || clips.reduce((a, b) => (a.duration > b.duration ? a : b)))
      .name;
  }, [clips]);

  const clipDur = useMemo(
    () => clips?.find((c) => c.name === clipName)?.duration || 0,
    [clips, clipName],
  );

  // idle pose
  useEffect(() => {
    if (!clipName || !actions[clipName]) return;
    const a = actions[clipName];
    a.reset().setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    a.play();
    a.paused = true;
    a.time = 0;
    mixer?.setTime(0);
  }, [actions, mixer, clipName]);

  // world pos of the golden ball
  const getBallWorldPos = useCallback(() => {
    const n =
      scene.getObjectByName("GoldenBallPotong") ||
      scene.getObjectByName("GoldenBall") ||
      scene.getObjectByProperty("userData.tag", "golden-ball") ||
      scene.children.find((c) => /ball/i.test(c.name || "")) ||
      scene;
    n.updateWorldMatrix(true, true);
    return new THREE.Vector3().setFromMatrixPosition(n.matrixWorld);
  }, [scene]);

  // schedule helpers
  const timers = useRef([]);
  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const later = useCallback(
    (fn, ms) => (
      timers.current.push(setTimeout(fn, ms)),
      timers.current.at(-1)
    ),
    [],
  );
  useEffect(() => clearAll, [clearAll]);

  // on finished animation
  useEffect(() => {
    if (!mixer) return;
    const h = (e) => {
      if (e.action?.getClip().name === clipName) {
        onZoomKick?.();
        onSimFinished?.(getBallWorldPos());
      }
    };
    mixer.addEventListener("finished", h);
    return () => mixer.removeEventListener("finished", h);
  }, [mixer, clipName, onZoomKick, onSimFinished, getBallWorldPos]);

  // click flow
  const playing = useRef(false);
  const clicked = useRef(false);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && !isZoomed && !playing.current && !clicked.current);

  const pull = useRef(false);
  useFrame((_, dt) => {
    const lever = leverRef.current;
    if (!lever) return;
    const target = pull.current ? Math.PI / 2 : 0;
    lever.rotation.x = clamp(
      damp(lever.rotation.x, target, 12, dt),
      0,
      Math.PI / 2,
    );
    if (pull.current && Math.abs(lever.rotation.x - Math.PI / 2) < 0.02)
      pull.current = false;
  });

  const onClick = (e) => {
    if (clicked.current || isZoomed || playing.current) return;
    e.stopPropagation();

    clicked.current = true;
    clearAll();

    setNextGoldenColor();
    pull.current = true;

    later(() => {
      const a = clipName && actions[clipName];
      if (!a || !clipDur) return;

      a.reset().setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
      a.paused = false;
      a.play();
      playing.current = true;
      onSimStarted?.();

      const START_AT = 0.2,
        POPUP_AT = 0.51;

      later(() => onZoomKick?.(), Math.max(0, clipDur * START_AT * 1000));
      later(
        () => onSimFinished?.(getBallWorldPos()),
        Math.max(0, clipDur * POPUP_AT * 1000),
      );
      later(
        () => {
          if (playing.current) {
            playing.current = false;
            onZoomKick?.();
            onSimFinished?.(getBallWorldPos());
          }
        },
        clipDur * 1000 + 100,
      );
    }, 1000);
  };

  // expose reset to Scene
  useEffect(() => {
    if (!registerReset) return;
    registerReset(() => {
      clicked.current = false;
      playing.current = false;
      clearAll();
      pull.current = false;
      if (leverRef.current) leverRef.current.rotation.x = 0;

      const a = clipName && actions[clipName];
      if (a) {
        a.stop();
        a.reset();
        a.play();
        a.paused = true;
        a.time = 0;
        mixer?.setTime(0);
      }
    });
  }, [actions, mixer, registerReset, clipName, clearAll]);

  return (
    <primitive
      ref={rootRef}
      object={scene}
      onPointerOver={(e) => {
        if (!isZoomed && !playing.current && !clicked.current)
          (e.stopPropagation(), setHovered(true));
      }}
      onPointerOut={(e) => {
        if (!isZoomed && !playing.current && !clicked.current)
          (e.stopPropagation(), setHovered(false));
      }}
      onPointerDown={onClick}
    />
  );
}

/* ───────────── scene (camera, lights) ───────────── */
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function Scene({
  onSimStarted,
  onSimFinished,
  resetSignal,
  shadowQuality = "auto",
  isMobile = false,
  shadowsOn,
  onParallaxChange,
  bodyColor,
}) {
  const decayCursorRef = useRef(false);
  const groupRef = useRef();
  const base = useCenterAndBase(groupRef, { mobile: isMobile });
  const { camera, gl } = useThree();

  useEffect(() => {
    gl.shadowMap.enabled = !!shadowsOn;
  }, [gl, shadowsOn]);

  const cursor = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const el = gl.domElement;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      cursor.current.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      cursor.current.y = clamp(
        -(((e.clientY - r.top) / r.height) * 2 - 1),
        -1,
        1,
      );
    };
    el.addEventListener("pointermove", move);
    return () => el.removeEventListener("pointermove", move);
  }, [gl]);

  const projectToPage = useCallback(
    (world) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = world.clone().project(camera);
      return {
        x: rect.left + (ndc.x * 0.5 + 0.5) * rect.width,
        y: rect.top + (-ndc.y * 0.5 + 0.5) * rect.height,
      };
    },
    [gl, camera],
  );

  const AZ = 0.22,
    PO = 0.16,
    CLOSE = isMobile ? 0.29 : 0.35,
    ZT = isMobile ? 3.0 : 2.3,
    ZPHI = isMobile ? Math.PI / 2.8 : Math.PI / 2.6,
    TY = 0.15,
    D = 5;

  const [zoomed, setZoomed] = useState(false);
  const zt = useRef(0);

  const leverReset = useRef(() => {});
  const registerReset = (fn) => (leverReset.current = fn);

  useEffect(() => {
    if (!resetSignal) return;
    setZoomed(false);
    leverReset.current?.();
    decayCursorRef.current = true;
  }, [resetSignal]);

  useFrame((_, dt) => {
    if (!base.current.ready) return;

    const target = zoomed ? 1 : 0;
    zt.current = clamp(
      zt.current + (target > zt.current ? dt / ZT : -dt / ZT),
      0,
      1,
    );
    const t = easeInOutCubic(zt.current);

    const baseT = base.current.target,
      baseY = base.current.baseY;

    const lookT = new THREE.Vector3().lerpVectors(
      baseT,
      new THREE.Vector3(0, baseY + TY, 0),
      t,
    );

    const cx = cursor.current.x,
      cy = cursor.current.y;

    const desiredTheta = base.current.theta - cx * AZ;
    const desiredPhi = clamp(
      THREE.MathUtils.lerp(base.current.phi, ZPHI, t) + cy * PO,
      0.1,
      Math.PI - 0.1,
    );
    const r = THREE.MathUtils.lerp(
      base.current.radius,
      base.current.radius * CLOSE,
      t,
    );

    const sph = new THREE.Spherical().setFromVector3(
      camera.position.clone().sub(lookT),
    );
    sph.theta = damp(sph.theta, desiredTheta, D, dt);
    sph.phi = damp(sph.phi, desiredPhi, D, dt);
    sph.radius = r;

    camera.position.copy(new THREE.Vector3().setFromSpherical(sph).add(lookT));
    camera.lookAt(lookT);

    onParallaxChange?.({ x: cx, y: cy });

    if (!zoomed && decayCursorRef.current) {
      cursor.current.x = damp(cursor.current.x, 0, 3, dt);
      cursor.current.y = damp(cursor.current.y, 0, 3, dt);
      if (
        Math.abs(cursor.current.x) < 0.001 &&
        Math.abs(cursor.current.y) < 0.001
      ) {
        decayCursorRef.current = false;
      }
    }
  });

  const high = shadowQuality !== "low" && !isMobile;
  const SHADOW = high ? 4096 : 2048;
  const B = 3.5;

  return (
    <>
      <hemisphereLight args={["#ffffff", "#dfe3ea", 0.7]} />
      <directionalLight
        position={[3, 6, 3]}
        intensity={1.5}
        castShadow={!!shadowsOn}
        shadow-mapSize-width={SHADOW}
        shadow-mapSize-height={SHADOW}
        shadow-camera-left={-B}
        shadow-camera-right={B}
        shadow-camera-top={B}
        shadow-camera-bottom={-B}
        shadow-camera-near={0.1}
        shadow-camera-far={15}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-radius={6}
        shadow-blurSamples={16}
      />
      <group ref={groupRef}>
        <Machine
          registerReset={registerReset}
          isZoomed={zoomed}
          onZoomKick={() => setZoomed(true)}
          onSimStarted={onSimStarted}
          onSimFinished={(worldPos) => onSimFinished?.(projectToPage(worldPos))}
          shadowsOn={!!shadowsOn}
          bodyColor={bodyColor}
        />
      </group>
    </>
  );
}

/* ───────────── root ───────────── */
export default function Experience() {
  const [entriesText, setEntriesText] = useState("1001, 2002, 3003, 4004");
  const [entries, setEntries] = useState(() =>
    parseEntriesText("1001, 2002, 3003, 4004"),
  );

  const defaultPrizes =
    "iPhone 16 Pro Max x1\nCoffee Voucher x3\nCap,2\nSticker - 5\nTote Bag";
  const [prizesText, setPrizesText] = useState(defaultPrizes);
  const [prizes, setPrizes] = useState(() => parsePrizesText(defaultPrizes));

  const [isSpinning, setIsSpinning] = useState(false);
  const [resetTick, setResetTick] = useState(0);
  const [burst, setBurst] = useState(null); // { text, prize }
  const [parallax, setParallax] = useState({ x: 0, y: 0 }); // -1..1

  // Theme state
  const THEME_KEY = "ld_theme";
  const [themeKey, setThemeKey] = useState(
    () => localStorage.getItem(THEME_KEY) || "cream",
  );
  useEffect(() => void localStorage.setItem(THEME_KEY, themeKey), [themeKey]);
  const theme = useMemo(
    () => THEMES.find((t) => t.key === themeKey) || THEMES[0],
    [themeKey],
  );

  const applyEntries = useCallback(
    () => setEntries(parseEntriesText(entriesText)),
    [entriesText],
  );
  const applyPrizes = useCallback(
    () => setPrizes(parsePrizesText(prizesText)),
    [prizesText],
  );

  const shown = useRef(false);

  const onSimStarted = () => {
    setIsSpinning(true);
    shown.current = false;
  };

  const onSimFinished = () => {
    if (shown.current) return;
    shown.current = true;

    if (!entries.length) {
      setIsSpinning(false);
      return;
    }

    const wi = cryptoRandomIndex(entries.length);
    const winner = entries[wi];
    setEntries(entries.slice(0, wi).concat(entries.slice(wi + 1)));

    const { prizeName, nextPrizes } = drawPrize(prizes);
    setPrizes(nextPrizes);

    setBurst({ text: String(winner), prize: prizeName || null });
    setIsSpinning(false);
  };

  const [isMobile, setIsMobile] = useState(
    () =>
      /iPhone|Android/i.test(navigator.userAgent) ||
      window.matchMedia("(max-width: 768px)").matches,
  );
  const [panelOpen, setPanelOpen] = useState(() => !isMobile);

  useEffect(() => {
    const q = window.matchMedia("(max-width: 768px)");
    const apply = () => {
      const mobile = /iPhone|Android/i.test(navigator.userAgent) || q.matches;
      setIsMobile(mobile);
      setPanelOpen(!mobile);
    };
    q.addEventListener("change", apply);
    return () => q.removeEventListener("change", apply);
  }, []);

  const isAndroidUA = /Android/i.test(navigator.userAgent);
  const lowEnd = useMemo(() => {
    const mem =
      typeof navigator.deviceMemory === "number" ? navigator.deviceMemory : 8;
    return isAndroidUA || mem <= 4;
  }, [isAndroidUA]);

  const [shadowQuality, setShadowQuality] = useState(isMobile ? "low" : "high");
  const [shadowsOn, setShadowsOn] = useState(() => !lowEnd);

  const onCreated = ({ gl }) => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.powerPreference = "high-performance";
    gl.setPixelRatio(
      isMobile
        ? Math.min(window.devicePixelRatio, 1.25)
        : Math.min(window.devicePixelRatio, 2),
    );
  };

  const RISE_DESKTOP = 350;
  const RISE_MOBILE = 120;

  return (
    <div className="app-root">
      <Canvas
        camera={{ position: [0, 1, 4], fov: 50 }}
        shadows={shadowsOn}
        dpr={isMobile ? [1, 1.25] : [1, 2]}
        onCreated={onCreated}
        style={{ background: theme.bg }}
      >
        <AdaptiveDpr pixelated />
        <PerformanceMonitor
          onDecline={() => {
            setShadowQuality("low");
            setShadowsOn(false);
          }}
          onIncline={() => {
            setShadowQuality(isMobile ? "low" : "high");
            if (!lowEnd && !isAndroidUA) setShadowsOn(true);
          }}
        />
        <Scene
          onSimStarted={onSimStarted}
          onSimFinished={onSimFinished}
          resetSignal={resetTick}
          shadowQuality={shadowQuality}
          isMobile={isMobile}
          shadowsOn={shadowsOn}
          onParallaxChange={setParallax}
          bodyColor={theme.body}
        />
      </Canvas>

      {burst && (
        <DigitBurst
          text={burst.text}
          delay={1200}
          digitDur={1000}
          spacing={isMobile ? 80 : 100}
          rise={isMobile ? RISE_MOBILE : RISE_DESKTOP}
          size={isMobile ? 90 : 130}
          parallax={parallax}
          parallaxStrength={8}
          closeDX={isMobile ? 160 : 210}
          closeDY={-24}
          prizeText={burst.prize}
          prizeOffset={isMobile ? 70 : 100}
          prizeSize={isMobile ? 20 : 30}
          prizeDelayExtra={1000}
          onClosed={() => {
            setBurst(null);
            setResetTick((t) => t + 1);
          }}
        />
      )}

      <LuckyDrawControls
        isMobile={isMobile}
        panelOpen={panelOpen}
        setPanelOpen={setPanelOpen}
        entriesText={entriesText}
        setEntriesText={setEntriesText}
        applyEntries={applyEntries}
        entries={entries}
        prizesText={prizesText}
        setPrizesText={setPrizesText}
        applyPrizes={applyPrizes}
        prizes={prizes}
        isSpinning={isSpinning}
      />
      <ThemePicker themes={THEMES} current={theme.key} onChange={setThemeKey} />
    </div>
  );
}

useGLTF.preload("/machine.glb");

"use client";

import React, { useEffect, useRef, useState, RefObject } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ExternalLink,
  Instagram,
  Youtube,
  Video,
  Link as LinkIcon,
} from "lucide-react";
import "@fontsource/inter";
import "@fontsource/rubik-wet-paint";

// -----------------------------
// THEME
// -----------------------------
const THEME = {
  devils: "#CE1126", // NJ Devils red
  turnpike: "#1B4D3E", // turnpike green
  neon: "#00FFC2", // shore neon (mint)
  sunset: "#FFB000", // gold
  ink: "#0B0F14", // near-black
  paper: "#F4F1E8", // off-white
};

// -----------------------------
// TEXTURES + WALL STYLE (with parallax-ready positions)
// -----------------------------
const wallTexture = {
  backgroundImage: [
    "url('/textures/cassette-tile.png')",
    "url('/textures/boombox-poster.png')",
    "url('/textures/torn-paper.png')",
    // micro-noise + scanlines slightly stronger
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)",
    "repeating-linear-gradient(180deg, rgba(0,0,0,0.0) 0 6px, rgba(255,255,255,0.06) 6px 7px, rgba(0,0,0,0.0) 7px 14px)",
    "radial-gradient(120% 70% at 50% 0%, rgba(206,17,38,0.30), transparent 55%)",
    "radial-gradient(200px 140px at 20% 65%, rgba(255,255,255,0.10), transparent 70%)",
    "radial-gradient(180px 120px at 70% 35%, rgba(255,255,255,0.08), transparent 70%)",
  ].join(","),
  backgroundBlendMode:
    "normal, multiply, multiply, overlay, overlay, multiply, normal, normal",
  backgroundSize: "auto, contain, 900px, auto, auto, auto, auto, auto",
  backgroundPosition:
    "center, right 10% bottom 15%, left 5% top 60%, center, center, center, center, center",
  backgroundRepeat:
    "repeat, no-repeat, no-repeat, repeat, repeat, no-repeat, no-repeat, no-repeat",
  // default desktop
  backgroundAttachment:
    "fixed, fixed, fixed, scroll, scroll, scroll, scroll, scroll",
  filter: "contrast(1.1) brightness(0.98)",
} as const;

// -----------------------------
// TRACK TYPE (from CMS)
// -----------------------------
type Track = {
  id: string;
  title: string;
  album?: string;
  src: string;     // absolute URL (Sanity CDN) or site-relative /audio/*.mp3
  color?: string;  // hex color
  tag?: string;    // short graffiti label
  x?: number;      // optional stored manual position (unused when auto-layout)
  y?: number;
};

// preserve original index when laying out so clicks map to the right song
type Placed = Track & { computedX: number; computedY: number; _idx: number };

// -----------------------------
// UTILS
// -----------------------------
function clsx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// deterministic jitter so tags don’t jump each render
function seededFloat(key: string, min: number, max: number) {
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const t = (h >>> 0) / 0xffffffff;
  return min + (max - min) * t;
}

// viewport width hook (to switch desktop/mobile layout)
function useViewportWidth() {
  const [w, setW] = React.useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  React.useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return w;
}

// -----------------------------
// AUTO-LAYOUT HELPERS (desktop zones + mobile grid)
// -----------------------------

// Desktop zones (A–F) as non-overlapping rectangles in % of the wall
 type Zone = "A" | "B" | "C" | "D" | "E" | "F";
 type Rect = { left: number; top: number; right: number; bottom: number };

const DESKTOP_BOUNDS: Record<Zone, Rect> = {
  A: { left: 8,  top: 12, right: 40, bottom: 38 }, // upper-left
  B: { left: 60, top: 12, right: 92, bottom: 38 }, // upper-right
  C: { left: 8,  top: 42, right: 40, bottom: 68 }, // mid-left
  D: { left: 60, top: 42, right: 92, bottom: 68 }, // mid-right
  E: { left: 8,  top: 70, right: 40, bottom: 92 }, // lower-left
  F: { left: 60, top: 70, right: 92, bottom: 92 }, // lower-right
};

// spread N items inside a rectangle (grid + mild jitter) while preserving original index
function placeInRectGeneric(items: { t: Track; idx: number }[], rect: Rect): Placed[] {
  const n = items.length;
  if (n === 0) return [];

  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);

  const left = Math.min(rect.left, rect.right);
  const right = Math.max(rect.left, rect.right);
  const top = Math.min(rect.top, rect.bottom);
  const bottom = Math.max(rect.top, rect.bottom);

  const w = right - left;
  const h = bottom - top;

  return items.map(({ t, idx }, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const gx = cols === 1 ? 0.5 : c / (cols - 1);
    const gy = rows === 1 ? 0.5 : r / (rows - 1);
    const jx = seededFloat(t.id + "-jx", -1.2, 1.2);
    const jy = seededFloat(t.id + "-jy", -1.2, 1.2);
    const computedX = left + gx * w + jx;
    const computedY = top + gy * h + jy;
    return { ...t, computedX, computedY, _idx: idx };
  });
}

// desktop layout: distribute tracks round-robin into A..F, then place
function placeTracksDesktop(tracks: Track[]): Placed[] {
  const zones: Zone[] = ["A", "B", "C", "D", "E", "F"];
  const buckets = new Map<Zone, { t: Track; idx: number }[]>();
  zones.forEach((z) => buckets.set(z, []));

  tracks.forEach((t, idx) => {
    const z = zones[idx % zones.length];
    buckets.get(z)!.push({ t, idx });
  });

  const out: Placed[] = [];
  for (const z of zones) {
    out.push(...placeInRectGeneric(buckets.get(z)!, DESKTOP_BOUNDS[z]));
  }
  return out;
}

// mobile layout: simple 2 rows × 5 columns grid (with mild jitter)
function layoutMobileGrid(tracks: Track[]): Placed[] {
  const cols = 5;
  const gapX = 100 / (cols + 1);
  const rowY = [30, 70];

  return tracks.map((t, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols) % 2;
    const baseX = gapX * (col + 1);
    const jx = seededFloat(t.id + "-mx", -1.5, 1.5);
    const jy = seededFloat(t.id + "-my", -0.8, 0.8);
    return { ...t, computedX: baseX + jx, computedY: rowY[row] + jy, _idx: idx };
  });
}

function layoutMobileStack(tracks: Track[]): Placed[] {
  const startY = 18, step = 7.5;
  return tracks.map((t, idx) => ({
    ...t,
    computedX: 50,
    computedY: startY + idx * step,
    _idx: idx,
  }));
}

// -----------------------------
// AUDIO VISUALIZER (C)
// -----------------------------
const mediaSourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

function Visualizer({ audioRef }: { audioRef: RefObject<HTMLAudioElement> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas) return;

    const audioCtx =
      ctxRef.current ?? new (window.AudioContext || (window as any).webkitAudioContext)();
    ctxRef.current = audioCtx;
    (globalThis as any).__ewbAudioCtx = audioCtx; // expose for resume

    audioRef.current!.muted = false; // force unmute on mount

    // Reuse (or create) media element source once per <audio>
    let source = mediaSourceMap.get(audio);
    if (!source) {
      source = audioCtx.createMediaElementSource(audio);
      mediaSourceMap.set(audio, source);
    }

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyserRef.current = analyser;

    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const ctx = canvas.getContext("2d")!;

    const render = () => {
      analyser.getByteFrequencyData(freqData);
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const bars = 24;
      const step = Math.floor(freqData.length / bars);
      const w = width / bars;

      for (let i = 0; i < bars; i++) {
        const v = freqData[i * step] / 255;
        const h = Math.max(2, v * height);
        const x = i * w + 2;
        ctx.fillStyle = THEME.neon;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, height - h, w - 4, h);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    const onResize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      const ctx2 = canvas.getContext("2d");
      if (ctx2) ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    onResize();
    window.addEventListener("resize", onResize);
    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      try {
        analyser.disconnect();
      } catch {}
    };
  }, [audioRef]);

  return (
    <div className="pointer-events-none absolute left-0 right-0 bottom-12 z-30" style={{ opacity: 0.95 }}>
      <canvas ref={canvasRef} className="block w-full h-16" />
    </div>
  );
}

// -----------------------------
// PLAYER HOOK
// -----------------------------
function usePlayer(list: Track[]) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  const current = list[index] ?? null;

  // Attach time/play/pause listeners once
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTime = () => {
      if (!el.duration) return;
      setProgress((el.currentTime / el.duration) * 100);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);

  // Load the current track (force absolute URL from domain root)
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !current) return; // guard if no tracks yet
    const p = current.src;
    const url = typeof window !== 'undefined'
      ? new URL(p, window.location.origin).toString()
      : p;
    el.src = url;
    el.play().catch(() => {});
  }, [index, current]);

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;

    // resume AudioContext on user gesture (Chrome/iOS requirement)
    const ac: AudioContext | undefined = (globalThis as any).__ewbAudioCtx;
    if (ac?.state === "suspended") {
      try { await ac.resume(); } catch {}
    }

    el.muted = false; // ensure not muted

    if (el.paused) {
      try { await el.play(); } catch {}
    } else {
      el.pause();
    }
  };

  const next = () => setIndex((i) => (i + 1) % list.length);
  const prev = () => setIndex((i) => (i - 1 + list.length) % list.length);
  const playFromIndex = (i: number) => setIndex(i);

  return {
    audioRef,
    current,
    index,
    setIndex,
    playing,
    toggle,
    next,
    prev,
    progress,
    muted,
    setMuted,
    playFromIndex,
  };
}

// -----------------------------
// GRAFFITI TAG (uses computedX/computedY)
// -----------------------------
function GraffitiTag({
  item,
  onClick,
  active,
  playing,
}: {
  item: Placed;
  onClick: () => void;
  active: boolean;
  playing: boolean;
}) {
  const style = { left: `${item.computedX}%`, top: `${item.computedY}%` } as const;
  const rotBase = seededFloat(`${item.id}-base`, -5, 5);
  const rotHover = seededFloat(`${item.id}-hover`, -2, 2);

  return (
    <motion.button
      onClick={onClick}
      aria-label={`Play ${item.title}`}
      className={clsx(
        "absolute select-none",
        "hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      )}
      initial={false}
      whileHover={{ rotate: rotHover }}
      style={{ ...style, transform: `rotate(${rotBase}deg)` }}
    >
      <motion.span
        className="relative inline-block px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 text-2xl sm:text-3xl md:text-5xl uppercase tracking-[0.10em]"
        style={{
          color: item.color,
          fontFamily: "'Rubik Wet Paint', system-ui, sans-serif",
          textShadow: `0 2px 0 ${THEME.ink}, 0 10px 20px rgba(0,0,0,0.45)`,
          WebkitTextStroke: "0.5px rgba(0,0,0,0.4)",
          background: `linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.15))`,
          border: `2px solid ${item.color}`,
          borderRadius: "6px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.4) inset",
        }}
        animate={
          active && playing ? { y: [0, -2, 0, 1, 0], rotate: [0, -1, 1, 0] } : undefined
        }
        transition={
          active && playing ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : undefined
        }
      >
        {item.tag}
        {/* drip dot */}
        {active && playing && (
          <span
            className="absolute left-1/2 -bottom-2 block w-1.5 h-1.5 rounded-full"
            style={{ background: item.color, boxShadow: `0 6px 0 0 ${THEME.ink}` }}
          />
        )}
      </motion.span>
    </motion.button>
  );
}

// -----------------------------
// PLAYER BAR
// -----------------------------
function PlayerBar({
  current,
  playing,
  toggle,
  next,
  prev,
  progress,
  muted,
  setMuted,
}: any) {
  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-40 border-t bg-black/70 backdrop-blur"
      style={{ borderColor: THEME.turnpike }}
    >
      <div className="mx-auto max-w-6xl px-3 py-2 grid grid-cols-3 items-center gap-2">
        <div className="text-xs md:text-sm">
          <div className="uppercase tracking-widest opacity-80">Now Playing</div>
          <div className="font-medium">{current?.title || "—"}</div>
          <div className="opacity-70">{current?.album || ""}</div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            aria-label="Previous"
            onClick={prev}
            className="p-2 rounded border hover:bg-white/5"
            style={{ borderColor: THEME.turnpike }}
          >
            <SkipBack size={18} />
          </button>
          <button
            aria-label="Play/Pause"
            onClick={toggle}
            className="px-4 py-2 rounded border uppercase tracking-wider text-xs hover:bg-white/5"
            style={{ borderColor: THEME.devils, color: THEME.paper }}
          >
            {playing ? (
              <span className="inline-flex items-center gap-2">
                <Pause size={16} /> Pause
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Play size={16} /> Play
              </span>
            )}
          </button>
          <button
            aria-label="Next"
            onClick={next}
            className="p-2 rounded border hover:bg-white/5"
            style={{ borderColor: THEME.turnpike }}
          >
            <SkipForward size={18} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3">
          <div className="h-1 w-28 md:w-40 bg-white/10 rounded overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${Math.min(100, Math.max(0, progress || 0))}%`,
                background: THEME.neon,
              }}
            />
          </div>
          <button
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => setMuted(!muted)}
            className="p-2 rounded border hover:bg-white/5"
            style={{ borderColor: THEME.turnpike }}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// LIGHTING FX
// -----------------------------
function LightingFX() {
  return (
    <>
      <style>{`
        @keyframes flicker { 
          0%, 100% { opacity: 1 }
          45% { opacity: .96 } 
          50% { opacity: .90 } 
          55% { opacity: .96 } 
        }
        /* Mobile: avoid background-attachment: fixed for smoother scroll */
        @media (max-width: 768px) {
          #wall {
            background-attachment: scroll, scroll, scroll, scroll, scroll, scroll, scroll, scroll !important;
          }
        }
      `}</style>

      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.12), transparent)",
          animation: "flicker 6s infinite",
          mixBlendMode: "overlay",
        }}
      />
      <span
        className="pointer-events-none absolute inset-y-0 left-0 w-24"
        style={{
          background: "linear-gradient(90deg, rgba(255,255,255,0.06), transparent)",
          animation: "flicker 7s infinite",
          mixBlendMode: "overlay",
        }}
      />
    </>
  );
}

// -----------------------------
// Section helper
// -----------------------------
function Section({
  id,
  title,
  accent,
  children,
}: {
  id: string;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 md:px-6 py-10">
      <h2
        className="text-xl md:text-2xl uppercase tracking-[0.3em] mb-6"
        style={{ color: accent }}
      >
        {title}
      </h2>
      <div className="grid md:grid-cols-2 gap-6">{children}</div>
    </section>
  );
}

// -----------------------------
// VHS FRAME + VIDEO EMBED (D)
// -----------------------------
function VHSFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative bg-black/60 rounded-lg border overflow-hidden"
      style={{ borderColor: THEME.turnpike }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)",
          mixBlendMode: "overlay",
        }}
      />
      <div className="absolute top-1 left-2 text-[10px] tracking-[0.3em] opacity-70">
        SP • EP • LP
      </div>
      <div className="absolute bottom-1 right-2 text-[10px] tracking-[0.3em] opacity-70">
        AUTO TRACKING
      </div>
      {children}
    </div>
  );
}

function VideoEmbed({ url, title }: { url: string; title: string }) {
  const isYouTube = /youtube\.com|youtu\.be/.test(url);
  const isVimeo = /vimeo\.com/.test(url);

  if (isYouTube || isVimeo) {
    return (
      <VHSFrame>
        <div className="aspect-video">
          <iframe
            src={url}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </VHSFrame>
    );
  }

  return (
    <VHSFrame>
      <div className="aspect-video grid place-items-center text-sm p-4">
        <a className="underline" href={url} target="_blank" rel="noreferrer">
          Open Video: {title}
        </a>
      </div>
    </VHSFrame>
  );
}

function MiniVHSPreview({ url, title }: { url?: string; title: string }) {
  const hasEmbed = !!url;
  const youtubeLink = LINKS.find((l) => l.label === "YouTube")?.href || "#";
  return (
    <div className="absolute left-3 bottom-28 z-30 w-[260px] md:w-[300px]">
      <VHSFrame>
        <div className="aspect-video">
          {hasEmbed ? (
            <iframe
              src={url!}
              title={title}
              className="w-full h-full"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-[11px] p-3">
              <a className="underline" href={youtubeLink} target="_blank" rel="noreferrer">
                Open “{title}” on YouTube
              </a>
            </div>
          )}
        </div>
      </VHSFrame>
    </div>
  );
}

// -----------------------------
// SELF-TEST (dev-only)
// -----------------------------
function runSelfTests(list: Track[]) {
  try {
    const bad = list.filter((t) => t.src?.startsWith("/eastwick-bully/"));
    if (bad.length) console.warn("[TEST] bad src format", bad);

    const notAudio = list.filter((t) => !t.src || !t.src.includes(".mp3"));
    if (notAudio.length) console.warn("[TEST] non-mp3 src", notAudio);
  } catch (e) {
    console.error("[TEST] failed", e);
  }
}

// -----------------------------
// LINKS & VIDEOS
// -----------------------------
const LINKS: { label: string; href: string; Icon: any }[] = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/eastside_bully_908?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    Icon: Instagram,
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@eastwickbullyakatommy.bost4527?si=Cx_Y7NCp741XmTnx",
    Icon: Youtube,
  },
  { label: "TikTok", href: "https://www.tiktok.com/@eastwickbully?_r=1&_t=ZT-912zlxaPnvZ", Icon: Video },
  { label: "Facebook Subscribe", href: "https://www.facebook.com/tommy.boston1/subscribenow", Icon: ExternalLink },
  { label: "Linktree", href: "#", Icon: LinkIcon },
];
const VIDEOS: { id: string; title: string; url: string }[] = [];
const TONE_SETTERS_EMBED: string = ""; // e.g. https://www.youtube.com/embed/VIDEO_ID
const NOTIFY_URL = "https://www.facebook.com/tommy.boston1/subscribenow";

// -----------------------------
// MAIN COMPONENT
// -----------------------------
export default function EastwickBullySite({ tracks }: { tracks: Track[] }) {
  // viewport width → choose layout
  const vw = useViewportWidth();
  const placedTracks: Placed[] = vw < 560 ? layoutMobileStack(tracks) : (vw < 800 ? layoutMobileGrid(tracks) : placeTracksDesktop(tracks));

  const {
    audioRef,
    current,
    index,
    setIndex,
    playing,
    toggle,
    next,
    prev,
    progress,
    muted,
    setMuted,
    playFromIndex,
  } = usePlayer(tracks);

  const [audioErr, setAudioErr] = useState<null | string>(null);
  const [showIntro, setShowIntro] = useState(true);

  // self-test when tracks arrive
  useEffect(() => {
    runSelfTests(tracks);
  }, [tracks]);

  // Subtle parallax for background texture layers
  const { scrollY } = useScroll();
  const parallaxPos = useTransform(scrollY, (v: number) => {
    const y1 = (v * 0.02).toFixed(2); // cassette (slow)
    const y2 = (v * 0.05).toFixed(2); // boombox (mid)
    const y3 = (v * -0.03).toFixed(2); // torn paper (opposite)
    return `center ${y1}px, right 10% calc(15% + ${y2}px), left 5% calc(60% + ${y3}px), center, center, center, center, center`;
  });
  const wallDim = useTransform(scrollY, [0, 800], [0, 0.45]);
  const toneIndex = tracks.findIndex((t) => t.id === "ewb010");

  return (
    <div
      style={{
        background: THEME.ink,
        color: THEME.paper,
        fontFamily: "Inter, ui-sans-serif, system-ui",
      }}
    >
      {/* HEADER */}
      <header className="border-b bg-black/30 backdrop-blur" style={{ borderColor: THEME.turnpike }}>
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span
              style={{ fontFamily: "'Rubik Wet Paint', system-ui, sans-serif", color: THEME.devils }}
              className="text-3xl md:text-5xl uppercase tracking-[0.12em] drop-shadow"
            >
              Eastwick Bully
            </span>
            <span
              className="hidden md:inline text-xs uppercase tracking-widest px-2 py-1 rounded-full"
              style={{ background: THEME.turnpike, color: "white" }}
            >
              Digital Manifesto
            </span>
          </div>

          {/* header social icons - only real links */}
          <div className="hidden md:flex items-center gap-2">
            {LINKS.filter((l) => l.href && l.href !== "#")
              .slice(0, 4)
              .map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={label}
                  className="inline-flex items-center justify-center w-9 h-9 rounded border hover:bg-white/5"
                  style={{ borderColor: THEME.turnpike }}
                >
                  <Icon size={16} />
                </a>
              ))}
          </div>

          <nav className="text-xs uppercase tracking-widest hidden sm:flex items-center gap-4">
            <a href="#wall" className="hover:underline">
              Wall
            </a>
            <a href="#videos" className="hover:underline">
              Videos
            </a>
            <a href="#manifesto" className="hover:underline">
              Manifesto
            </a>
            <a href="#bio" className="hover:underline">
              Bio
            </a>
            <a href="#live" className="hover:underline">
              Live
            </a>
            <a href="#links" className="hover:underline">
              Links
            </a>
          </nav>
        </div>
      </header>

      {/* SPLASH INTRO (click to enter) */}
      {showIntro && (
        <div
          className="fixed inset-0 z-50 grid place-items-center"
          style={{ background: "radial-gradient(80% 60% at 50% 40%, rgba(206,17,38,0.35), rgba(11,15,20,0.98))" }}
        >
          <div className="text-center p-6">
            <div className="text-4xl md:text-6xl mb-3" style={{ fontFamily: "'Rubik Wet Paint', system-ui, sans-serif", color: THEME.sunset }}>
              Eastwick Bully
            </div>
            <div className="uppercase tracking-[0.3em] text-sm md:text-base opacity-80 mb-6">Digital Manifesto</div>
            <button
              onClick={() => setShowIntro(false)}
              className="px-6 py-3 rounded border text-xs uppercase tracking-widest hover:opacity-90"
              style={{ borderColor: THEME.devils, background: `linear-gradient(90deg, ${THEME.devils}, ${THEME.turnpike})`, color: "white" }}
            >
              Enter
            </button>
          </div>
        </div>
      )}

      {/* TAG WALL */}
      <motion.main
        id="wall"
        className="relative h-[92svh] md:h-[88svh] overflow-hidden"
        style={{ ...(wallTexture as any), backgroundPosition: parallaxPos as any }}
      >
        {/* neon mint tint overlay with scroll-driven opacity */}
        <motion.span
          className="pointer-events-none absolute inset-0 z-[5]"
          style={{ background: `${THEME.neon}08`, opacity: wallDim, mixBlendMode: "color-dodge" }}
        />

        {/* corner fade vignette */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{ background: "radial-gradient(100% 100% at 50% 50%, transparent 60%, rgba(0,0,0,0.45) 100%)" }}
        />

        {/* wall border overlay */}
        <div
          className="absolute inset-0 border-[10px] md:border-[16px] rounded-sm"
          style={{ borderColor: THEME.turnpike, boxShadow: `0 0 0 1px ${THEME.devils} inset`, mixBlendMode: "overlay" }}
        />

        {/* graffiti tags (auto-placed) */}
        {placedTracks.map((t, i) => (
          <GraffitiTag
            key={t.id}
            item={t}
            active={t._idx === index}
            playing={playing}
            onClick={() => playFromIndex(t._idx)}
          />
        ))}

        {/* audio */}
        <audio
          ref={audioRef}
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
          onEnded={next}
          muted={muted}
          onError={(e) =>
            setAudioErr(
              (e.currentTarget && (e.currentTarget as HTMLAudioElement).src) ||
              "Audio failed to load"
            )
          }
        />

        {/* tone setters mini preview */}
        {index === toneIndex && <MiniVHSPreview url={TONE_SETTERS_EMBED} title="Tone Setters" />}

        <Visualizer audioRef={audioRef} />
        <PlayerBar
          current={current}
          playing={playing}
          toggle={toggle}
          next={next}
          prev={prev}
          progress={progress}
          muted={muted}
          setMuted={setMuted}
        />
        <LightingFX />

        {/* audio error banner */}
        {audioErr && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 rounded bg-red-600/90 text-white text-xs px-3 py-2 shadow">
            Could not load audio: <span className="underline break-all">{audioErr}</span>
            <span className="ml-2">(Check that the file exists in <code>/public/audio</code> and the name matches.)</span>
          </div>
        )}
      </motion.main>

      {/* VIDEOS (D) */}
      <Section id="videos" title="Video Broadcasts" accent={THEME.neon}>
        {VIDEOS.length ? (
          VIDEOS.map((v) => (
            <div key={v.id} className="col-span-1">
              <h3 className="text-sm uppercase tracking-widest mb-2 opacity-80">{v.title}</h3>
              <VideoEmbed url={v.url} title={v.title} />
            </div>
          ))
        ) : (
          <div className="rounded-xl border p-6 bg-black/30 backdrop-blur col-span-2" style={{ borderColor: THEME.neon }}>
            <p className="opacity-80 text-sm">
              Paste your real YouTube/Vimeo embed link into the <code>VIDEOS</code> array (e.g.
              <code> https://www.youtube.com/embed/VIDEO_ID</code>) and it will render here.
            </p>
          </div>
        )}
      </Section>

      {/* MANIFESTO */}
      <Section id="manifesto" title="Manifesto" accent={THEME.devils}>
        <div className="rounded-xl border p-6 bg-black/30 backdrop-blur" style={{ borderColor: THEME.devils }}>
          <p className="leading-relaxed">
            This is not an ad. This is a broadcast. The wall is the medium; the message is the music. No polish, no
            permission — just raw truth from Eastwick to the world.
          </p>
        </div>
        <div className="rounded-xl border p-6 bg-black/30 backdrop-blur" style={{ borderColor: THEME.turnpike }}>
          <ul className="space-y-2 text-sm">
            <li>• Sound over sales.</li>
            <li>• Message over metrics.</li>
            <li>• Community over clout.</li>
          </ul>
        </div>
      </Section>

      {/* BIO */}
      <Section id="bio" title="About Eastside Bully" accent={THEME.turnpike}>
        {/* Left column: main bio text */}
        <div className="rounded-xl border p-6 bg-black/30 backdrop-blur" style={{ borderColor: THEME.turnpike }}>
          <p className="leading-relaxed text-sm md:text-base">
            Eastside Bully is a rising force in the rap scene, known for his distinctive sound that seamlessly blends
            hard-hitting lyrical delivery with soulful melodies. Drawing inspiration from iconic hip-hop acts such as
            The Lox, Curren$y, Mobb Deep, and Dark Lo, Bullie has crafted a style that resonates deeply with fans of
            authentic street narratives and real-life storytelling.
          </p>
          <p className="leading-relaxed text-sm md:text-base mt-4">
            Hailing from the vibrant streets of Union &amp; Essex County, New Jersey, Eastside Bullie's journey into
            music has been as dynamic as the beats he raps over. His early exposure to hip-hop culture set the
            foundation for his passion, leading him to hone his craft and develop a unique voice that stands out in a
            crowded industry.
          </p>
          <p className="leading-relaxed text-sm md:text-base mt-4">
            In addition to his music, Bullie has garnered significant attention as a host on Bigo, where his engaging
            personality and keen insights into the music industry have made him a viral sensation. His ability to
            connect with audiences has translated into successful hosting gigs, including a prominent panel for music
            discussions that showcase emerging talents and industry veterans alike.
          </p>
          <p className="leading-relaxed text-sm md:text-base mt-4">
            Eastside Bully's recent projects, including the much-anticipated "Don't Count Me Out" and the
            collaborative effort "Nasty Boyz Vol. 1," reflect his growth as an artist and his commitment to pushing the
            boundaries of his sound. These works not only highlight his lyrical prowess but also his versatility as he
            explores various themes and musical styles.
          </p>
          <p className="leading-relaxed text-sm md:text-base mt-4">
            As he continues to rise in the ranks, Eastside Bully is dedicated to creating music that speaks to the
            struggles and triumphs of everyday life, while inspiring others to pursue their dreams relentlessly. With a
            growing fanbase and a slate of exciting projects ahead, Eastside Bully is poised to make a lasting impact on
            the hip-hop landscape. Keep an eye on this talented artist as he prepares to leave his mark on the industry.
          </p>
        </div>

        {/* Right column: photo + quick facts */}
        <div className="space-y-4">
          {/* Photo card */}
          <div className="rounded-xl overflow-hidden border bg-black/30 backdrop-blur" style={{ borderColor: THEME.devils }}>
            <img src="/images/bully1.png" alt="Eastside Bully" className="w-full h-auto block" />
          </div>

          {/* Quick facts */}
          <div className="rounded-xl border p-6 bg-black/30 backdrop-blur space-y-2" style={{ borderColor: THEME.devils }}>
            <div className="text-xs uppercase tracking-widest opacity-80">Quick Facts</div>
            <ul className="text-sm space-y-1">
              <li>• Hometown: Union &amp; Essex County, NJ</li>
              <li>• Vibe: 90s Jersey — raw &amp; real</li>
              <li>• Message: Sound over sales, truth over trends</li>
              <li>• Influences: The Lox, Curren$y, Mobb Deep, Dark Lo</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* LIVE (no events yet) */}
      <Section id="live" title="Live" accent={THEME.sunset}>
        <div className="rounded-xl border p-6 bg-black/30 backdrop-blur col-span-2 space-y-4" style={{ borderColor: THEME.sunset }}>
          <p className="opacity-80 text-sm">No shows announced yet — get notified when we drop new dates.</p>
          <a
            className="inline-flex w-fit items-center gap-2 px-4 py-2 rounded border text-xs uppercase tracking-widest hover:bg-white/5"
            style={{ borderColor: THEME.devils }}
            href={NOTIFY_URL}
            target="_blank"
            rel="noreferrer"
          >
            Notify Me <ExternalLink size={14} />
          </a>
        </div>
      </Section>

      {/* LINKS */}
      <Section id="links" title="Links" accent={THEME.turnpike}>
        <div className="col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {LINKS.filter((l) => l.href && l.href !== "#").map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border p-4 bg-black/30 backdrop-blur hover:bg-black/40 transition"
                style={{ borderColor: THEME.turnpike }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md border" style={{ borderColor: THEME.turnpike }}>
                    <Icon size={18} />
                  </div>
                  <div className="text-sm font-medium group-hover:underline">{label}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-6xl px-4 md:px-6 py-10 opacity-80 text-xs">
        © 2025 Eastwick Bully — Built as a living wall. v2025-11-04-01
      </footer>
    </div>
  );
}
import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.scss";

type Visualizer = ReturnType<
	typeof import("butterchurn").default.createVisualizer
>;

interface MediaGraph {
	context: AudioContext;
	source: AudioNode;
}

interface DrawableSize {
	width: number;
	height: number;
}

const graphs = new WeakMap<HTMLMediaElement, MediaGraph>();
const decodedBuffers = new Map<string, Promise<AudioBuffer | null>>();

// One preset, fetched on its own. The full butterchurn-presets bundle stays out.
const VISUALIZATION_PRESET = "Geiss - Waterfall";
// Butterchurn's analyser window. A paused element reports silence, so a seek
// frame is built from the decoded samples instead of that window.
const FFT_SIZE = 1024;
// Frames to skip after a playing scrub so the decoder glitch is not drawn.
const SEEK_HOLD_FRAMES = 3;

function loadVisualizationPreset(): Promise<object> {
	return import(
		"butterchurn-presets/presets/converted/Geiss - Waterfall.json"
	).then((mod: { default: object }) => mod.default);
}

function audioBufferFor(
	media: HTMLMediaElement,
	context: AudioContext,
): Promise<AudioBuffer | null> {
	const url = media.currentSrc || media.src;
	if (!url) return Promise.resolve(null);
	const existing = decodedBuffers.get(url);
	if (existing) return existing;
	const job = fetch(url)
		.then((response) => response.arrayBuffer())
		.then((bytes) => context.decodeAudioData(bytes.slice(0)))
		.catch(() => null);
	decodedBuffers.set(url, job);
	return job;
}

function pixelScale(): number {
	const ratio = window.devicePixelRatio;
	if (!ratio || ratio < 1) return 1;
	return Math.min(ratio, 2);
}

function drawableSize(canvas: HTMLCanvasElement): DrawableSize | null {
	const cssWidth = canvas.clientWidth;
	const cssHeight = canvas.clientHeight;
	if (cssWidth < 2 || cssHeight < 2) return null;
	const scale = pixelScale();
	return {
		width: Math.max(1, Math.floor(cssWidth * scale)),
		height: Math.max(1, Math.floor(cssHeight * scale)),
	};
}

function nextFrame(): Promise<void> {
	return new Promise((resolve) => {
		requestAnimationFrame(() => {
			resolve();
		});
	});
}

async function waitForSize(
	canvas: HTMLCanvasElement,
	isStopped: () => boolean,
): Promise<DrawableSize | null> {
	while (!isStopped()) {
		const size = drawableSize(canvas);
		if (size) return size;
		await nextFrame();
	}
	return null;
}

function captureStreamOf(media: HTMLMediaElement): MediaStream | null {
	const capture = (
		media as HTMLMediaElement & { captureStream?: () => MediaStream }
	).captureStream;
	if (!capture) return null;
	const stream = capture.call(media);
	if (!stream.getAudioTracks()[0]) return null;
	return stream;
}

// One graph per element. createMediaElementSource can only run once, and the
// element stays silent unless that source also reaches the speakers.
// Butterchurn only taps its internal analyser.
function audioGraphFor(media: HTMLMediaElement): MediaGraph {
	const existing = graphs.get(media);
	if (existing) {
		if (existing.context.state !== "closed") return existing;
		graphs.delete(media);
	}
	const context = new AudioContext();
	try {
		const source = context.createMediaElementSource(media);
		source.connect(context.destination);
		const graph = { context, source };
		graphs.set(media, graph);
		return graph;
	} catch (error) {
		const stream = captureStreamOf(media);
		if (!stream) {
			context.close().catch(() => {
				// A context that never started can close quietly.
			});
			throw error;
		}
		const source = context.createMediaStreamSource(stream);
		const graph = { context, source };
		graphs.set(media, graph);
		return graph;
	}
}

function resumeGraph(media: HTMLMediaElement) {
	const graph = graphs.get(media);
	if (graph?.context.state !== "suspended") return;
	graph.context.resume().catch(() => {
		// The next gesture tries again.
	});
}

type VisualizerFactory = typeof import("butterchurn").default.createVisualizer;

// Vite's prebundle keeps the CJS `__esModule` wrapper, so the factory can sit
// on `default` or on `default.default`.
function methodOf(
	value: unknown,
	key: string,
): ((...args: unknown[]) => unknown) | null {
	let current = value;
	for (let depth = 0; depth < 4; depth += 1) {
		if (
			(typeof current === "object" || typeof current === "function") &&
			current !== null &&
			key in current
		) {
			const method = (current as Record<string, unknown>)[key];
			if (typeof method === "function") {
				return method as (...args: unknown[]) => unknown;
			}
		}
		if (
			!current ||
			(typeof current !== "object" && typeof current !== "function") ||
			!("default" in current)
		) {
			return null;
		}
		current = (current as { default: unknown }).default;
	}
	return null;
}

function byteForSample(sample: number): number {
	const byte = Math.round(128 + sample * 128);
	if (byte <= 0) return 0;
	if (byte >= 255) return 255;
	return byte;
}

function playheadSamples(
	buffer: AudioBuffer,
	time: number,
): {
	timeByteArray: Uint8Array;
	timeByteArrayL: Uint8Array;
	timeByteArrayR: Uint8Array;
} {
	const end = Math.floor(Math.max(time, 0) * buffer.sampleRate);
	let start = end - FFT_SIZE;
	if (start < 0) start = 0;
	const last = buffer.length - FFT_SIZE;
	if (last >= 0 && start > last) start = last;
	const left = buffer.getChannelData(0);
	const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
	const timeByteArray = new Uint8Array(FFT_SIZE);
	const timeByteArrayL = new Uint8Array(FFT_SIZE);
	const timeByteArrayR = new Uint8Array(FFT_SIZE);
	for (let index = 0; index < FFT_SIZE; index += 1) {
		const sampleIndex = start + index;
		const sampleL = sampleIndex < left.length ? left[sampleIndex] : 0;
		const sampleR = sampleIndex < right.length ? right[sampleIndex] : 0;
		timeByteArrayL[index] = byteForSample(sampleL);
		timeByteArrayR[index] = byteForSample(sampleR);
		timeByteArray[index] = byteForSample((sampleL + sampleR) * 0.5);
	}
	return { timeByteArray, timeByteArrayL, timeByteArrayR };
}

function drawFrame(visualizer: Visualizer): boolean {
	try {
		visualizer.render();
		return true;
	} catch {
		return false;
	}
}

function factoryFrom(mod: unknown): VisualizerFactory {
	const createVisualizer = methodOf(mod, "createVisualizer");
	if (!createVisualizer) throw new Error("Butterchurn is unavailable");
	return createVisualizer as VisualizerFactory;
}

// Milkdrop on the audio stage. The same canvas is WebGL only.
export default function AudioVisualizer({
	media,
}: {
	media: HTMLMediaElement | null;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!(canvas && media)) return;

		let stopped = false;
		let frame = 0;
		let painting = false;
		let seekToken = 0;
		let seekTimer = 0;
		let holdFrames = 0;
		let wantPaint = !(media.paused || media.ended);
		let observer: ResizeObserver | null = null;
		let visualizer: Visualizer | null = null;
		let source: AudioNode | null = null;
		let kickPaint = () => {
			// Replaced once the visualizer exists.
		};

		const onGesture = () => {
			resumeGraph(media);
		};
		const onPlay = () => {
			wantPaint = true;
			seekToken += 1;
			resumeGraph(media);
			kickPaint();
		};
		const onHalt = () => {
			wantPaint = false;
			painting = false;
			cancelAnimationFrame(frame);
		};
		const paintPausedSeek = async (token: number) => {
			const current = visualizer;
			if (stopped || wantPaint || !current || token !== seekToken || !graph) {
				return;
			}
			const buffer = await audioBufferFor(media, graph.context);
			if (
				stopped ||
				wantPaint ||
				token !== seekToken ||
				!visualizer ||
				!buffer
			) {
				return;
			}
			try {
				visualizer.render({
					audioLevels: playheadSamples(buffer, media.currentTime),
					elapsedTime: 1 / 30,
				});
			} catch {
				// A failed seek redraw leaves the previous frame.
			}
		};
		const onSeek = () => {
			if (wantPaint) {
				holdFrames = SEEK_HOLD_FRAMES;
				return;
			}
			const token = seekToken + 1;
			seekToken = token;
			window.clearTimeout(seekTimer);
			seekTimer = window.setTimeout(() => {
				paintPausedSeek(token).catch(() => {
					// A failed seek redraw leaves the previous frame.
				});
			}, 40);
		};

		let graph: MediaGraph | null = null;
		try {
			graph = audioGraphFor(media);
			source = graph.source;
		} catch {
			setMessage("This audio file could not be routed into the visualizer.");
		}

		window.addEventListener("pointerdown", onGesture, true);
		media.addEventListener("play", onPlay);
		media.addEventListener("pause", onHalt);
		media.addEventListener("ended", onHalt);
		media.addEventListener("seeking", onSeek);
		media.addEventListener("seeked", onSeek);
		if (wantPaint) onPlay();

		const stop = () => {
			stopped = true;
			seekToken += 1;
			window.clearTimeout(seekTimer);
			cancelAnimationFrame(frame);
			observer?.disconnect();
			window.removeEventListener("pointerdown", onGesture, true);
			media.removeEventListener("play", onPlay);
			media.removeEventListener("pause", onHalt);
			media.removeEventListener("ended", onHalt);
			media.removeEventListener("seeking", onSeek);
			media.removeEventListener("seeked", onSeek);
			if (visualizer && source) {
				try {
					visualizer.disconnectAudio(source);
				} catch {
					// The node may already be disconnected.
				}
			}
			const element = media;
			queueMicrotask(() => {
				const current = graphs.get(element);
				if (current && !element.isConnected) {
					current.context.close().catch(() => {
						// Closing a closed context is ignored.
					});
					graphs.delete(element);
				}
			});
		};

		if (!graph) return stop;
		const ready = graph;

		const boot = async () => {
			const size = await waitForSize(canvas, () => stopped);
			if (stopped || !size) return;
			const [butterchurnMod, preset] = await Promise.all([
				import("butterchurn"),
				loadVisualizationPreset(),
			]);
			if (stopped) return;

			canvas.width = size.width;
			canvas.height = size.height;
			const createVisualizer = factoryFrom(butterchurnMod);
			visualizer = createVisualizer(ready.context, canvas, {
				width: size.width,
				height: size.height,
				pixelRatio: 1,
			});
			visualizer.connectAudio(ready.source);
			try {
				visualizer.loadPreset(preset, 0);
				visualizer.launchSongTitleAnim(VISUALIZATION_PRESET);
			} catch {
				if (!stopped) setMessage("Butterchurn could not draw this preset.");
				return;
			}

			let renderFailures = 0;
			const failDraw = () => {
				renderFailures += 1;
				if (renderFailures <= 2) return false;
				if (!stopped) setMessage("Butterchurn could not draw this preset.");
				painting = false;
				return true;
			};
			const paint = () => {
				const current = visualizer;
				if (stopped || !current || !wantPaint) {
					painting = false;
					return;
				}
				// The element outputs a broken buffer while the playhead is moving,
				// and for a few frames after it lands.
				if (media.seeking || holdFrames > 0) {
					if (!media.seeking) holdFrames -= 1;
					frame = requestAnimationFrame(paint);
					return;
				}
				if (drawFrame(current)) renderFailures = 0;
				else if (failDraw()) return;
				frame = requestAnimationFrame(paint);
			};
			kickPaint = () => {
				if (stopped || !visualizer || painting || !wantPaint) return;
				painting = true;
				paint();
			};
			kickPaint();

			observer = new ResizeObserver(() => {
				if (stopped || !visualizer) return;
				const next = drawableSize(canvas);
				if (!next) return;
				if (canvas.width === next.width && canvas.height === next.height) {
					return;
				}
				canvas.width = next.width;
				canvas.height = next.height;
				visualizer.setRendererSize(next.width, next.height);
			});
			observer.observe(canvas);
		};

		boot().catch(() => {
			if (!stopped) setMessage("Butterchurn could not start.");
		});

		return stop;
	}, [media]);

	return (
		<>
			<canvas
				ref={canvasRef}
				className={styles.canvas}
				aria-label="Music visualizer"
			/>
			<p className={styles.preset}>{VISUALIZATION_PRESET}</p>
			{message ? <p className={styles.note}>{message}</p> : null}
		</>
	);
}

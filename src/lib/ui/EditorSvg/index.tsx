import {
	Box,
	Button,
	Divider,
	Group,
	ScrollArea,
	Slider,
	Stack,
	Switch,
	Text,
} from "@mantine/core";
import { useDebouncedCallback, useThrottledCallback } from "@mantine/hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditorSvgHandlers, useSvgPreviewHandlers } from "./handlers";
import {
	formatBytes,
	formatSaving,
	gzipSize,
	readSvgDimensions,
	utf8Size,
} from "./optimize";
import {
	defaultSvgSettings,
	SVG_PLUGINS,
	type SvgOptimizeSettings,
} from "./plugins";
import styles from "./styles.module.scss";

const SETTINGS_KEY = "__dysumi_svgomg";
// Switches update immediately. Optimize runs at once, then at most every
// 200ms while the burst continues, and once more after the switches settle.
const OPTIMIZE_THROTTLE_MS = 200;
const OPTIMIZE_DEBOUNCE_MS = 120;

let svgWorker: Worker | null = null;

function getSvgWorker(): Worker {
	if (!svgWorker) {
		svgWorker = new Worker(
			new URL("../../workers/svg-optimize.worker.ts", import.meta.url),
			{ type: "module" },
		);
	}
	return svgWorker;
}

function loadSettings(): SvgOptimizeSettings {
	const defaults = defaultSvgSettings();
	if (typeof localStorage === "undefined") return defaults;
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (!raw) return defaults;
		const parsed = JSON.parse(raw) as Partial<SvgOptimizeSettings>;
		return {
			...defaults,
			...parsed,
			plugins: { ...defaults.plugins, ...parsed.plugins },
		};
	} catch {
		return defaults;
	}
}

export default function EditorSvg({
	source,
	onSave,
	onRefresh,
	onOutput,
}: {
	source: string;
	onSave: (svg: string) => Promise<void>;
	onRefresh: () => Promise<void>;
	onOutput?: (svg: string) => void;
}) {
	const [settings, setSettings] = useState(loadSettings);
	const [output, setOutput] = useState<string | null>(null);
	const [optimizeError, setOptimizeError] = useState<string | null>(null);
	const [gzip, setGzip] = useState<{
		original: number;
		optimized: number;
	} | null>(null);
	const [saving, setSaving] = useState(false);
	const [locked, setLocked] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [optimizing, setOptimizing] = useState(true);
	const requestId = useRef(0);
	useEffect(() => {
		if (output) onOutput?.(output);
	}, [onOutput, output]);
	const lockedRef = useRef(false);
	const lastSvg = useRef<string | null>(null);
	const lastSettings = useRef<string | null>(null);
	const desiredKey = useRef("");
	const settledKey = useRef<string | null>(null);
	lockedRef.current = locked;

	const persistSettings = useDebouncedCallback(
		(next: SvgOptimizeSettings) => {
			localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
		},
		{ delay: 200, flushOnUnmount: true },
	);

	const postOptimize = useCallback((svg: string, next: SvgOptimizeSettings) => {
		if (lockedRef.current) return;
		const settingsKey = JSON.stringify(next);
		if (lastSvg.current === svg && lastSettings.current === settingsKey) {
			if (settledKey.current === desiredKey.current) setOptimizing(false);
			return;
		}
		lastSvg.current = svg;
		lastSettings.current = settingsKey;
		setOptimizing(true);
		const worker = getSvgWorker();
		const id = requestId.current + 1;
		requestId.current = id;
		worker.postMessage({ id, svg, settings: next });
	}, []);

	const throttledOptimize = useThrottledCallback(
		postOptimize,
		OPTIMIZE_THROTTLE_MS,
	);
	const debouncedOptimize = useDebouncedCallback(
		postOptimize,
		OPTIMIZE_DEBOUNCE_MS,
	);

	useEffect(() => {
		persistSettings(settings);
	}, [settings, persistSettings]);

	useEffect(() => {
		const worker = getSvgWorker();
		const onMessage = (
			event: MessageEvent<{ id: number; data?: string; error?: string }>,
		) => {
			if (lockedRef.current || event.data.id !== requestId.current) return;
			const applied = `${lastSvg.current}\0${lastSettings.current}`;
			settledKey.current = applied;
			if (applied === desiredKey.current) setOptimizing(false);
			if (event.data.error) {
				setOutput(null);
				setOptimizeError(event.data.error);
				return;
			}
			setOutput(event.data.data ?? null);
			setOptimizeError(null);
		};
		worker.addEventListener("message", onMessage);
		return () => worker.removeEventListener("message", onMessage);
	}, []);

	useEffect(() => {
		if (locked) {
			debouncedOptimize.cancel();
			setOptimizing(false);
			return;
		}
		desiredKey.current = `${source}\0${JSON.stringify(settings)}`;
		setOptimizing(settledKey.current !== desiredKey.current);
		throttledOptimize(source, settings);
		debouncedOptimize(source, settings);
	}, [source, settings, locked, throttledOptimize, debouncedOptimize]);

	useEffect(() => {
		let cancel = false;
		const measure = async () => {
			const originalSize = await gzipSize(source);
			const optimizedSize = await gzipSize(output ?? "");
			if (cancel || originalSize === null || optimizedSize === null) return;
			setGzip({ original: originalSize, optimized: optimizedSize });
		};
		measure().catch(() => {
			if (!cancel) setGzip(null);
		});
		return () => {
			cancel = true;
		};
	}, [source, output]);

	const shown = settings.showOriginal || output === null ? source : output;
	const dimensions = useMemo(() => readSvgDimensions(shown), [shown]);
	const rawBefore = utf8Size(source);
	const rawAfter = utf8Size(output ?? source);
	const before = settings.compareGzip && gzip ? gzip.original : rawBefore;
	const after = settings.compareGzip && gzip ? gzip.optimized : rawAfter;
	const savingLabel = formatSaving(before, after);
	const grew = after > before;
	const {
		onSaveClick,
		onRefreshClick,
		onShowOriginal,
		onCompareGzip,
		onPretty,
		onMultipass,
		onFloatPrecision,
		onTransformPrecision,
		onPluginChange,
		onReset,
	} = useEditorSvgHandlers({
		locked,
		settings,
		setSettings,
		output,
		onSave,
		onRefresh,
		setSaving,
		setSaveError,
		setLocked,
	});

	return (
		<div className={styles.layout}>
			<div className={styles.preview}>
				<Group
					className={styles.bar}
					justify="space-between"
					wrap="nowrap"
					gap="xs"
				>
					<Text size="sm" px="sm" truncate="end">
						{dimensions ?? "SVG"}
					</Text>
					<Text size="xs" c="dimmed" px="sm">
						{settings.showOriginal ? "Original" : "Optimized"}
					</Text>
				</Group>
				<Divider />
				<Preview svg={shown} />
				<Divider />
				<Group className={styles.bar} justify="space-between" wrap="nowrap">
					<Group gap="md" px="sm" wrap="nowrap">
						<Text size="xs">
							Original{" "}
							<Text span fw={600}>
								{formatBytes(before)}
							</Text>
						</Text>
						<Text size="xs">
							Optimized{" "}
							<Text span fw={600}>
								{formatBytes(after)}
							</Text>
						</Text>
						<Text size="xs" fw={600} c={grew ? "red" : "teal"}>
							{savingLabel}
							{settings.compareGzip ? " gzip" : ""}
						</Text>
					</Group>
					<Group gap={4} mx="xs" wrap="nowrap">
						<Button
							size="compact-xs"
							variant="default"
							disabled={
								locked || optimizing || !output || Boolean(optimizeError)
							}
							loading={saving}
							onClick={onSaveClick}
						>
							{locked ? "Saved" : "Save"}
						</Button>
						<Button
							size="compact-xs"
							variant="default"
							onClick={onRefreshClick}
						>
							Refresh
						</Button>
					</Group>
				</Group>
				{optimizeError ? (
					<Text size="xs" c="red" px="sm" py={4} role="alert">
						{optimizeError}
					</Text>
				) : null}
				{saveError ? (
					<Text size="xs" c="red" px="sm" py={4} role="alert">
						{saveError}
					</Text>
				) : null}
			</div>
			<Box className={styles.settings}>
				<Group className={styles.bar} wrap="nowrap">
					<Text size="sm" px="sm" truncate="end">
						Settings
					</Text>
				</Group>
				<Divider />
				<ScrollArea className={styles.settingsScroll} scrollbars="y">
					<fieldset disabled={locked} className={styles.fields}>
						<Stack gap="xs" p="sm">
							<Text size="xs" c="dimmed">
								Output
							</Text>
							<Switch
								size="xs"
								disabled={locked}
								label="Show original"
								checked={settings.showOriginal}
								onChange={onShowOriginal}
							/>
							<Switch
								size="xs"
								disabled={locked}
								label="Compare gzipped"
								checked={settings.compareGzip}
								onChange={onCompareGzip}
							/>
							<Switch
								size="xs"
								disabled={locked}
								label="Prettify output"
								checked={settings.pretty}
								onChange={onPretty}
							/>
							<Switch
								size="xs"
								disabled={locked}
								label="Multipass"
								checked={settings.multipass}
								onChange={onMultipass}
							/>
							<Box>
								<Text size="xs" mb={4}>
									Number precision {settings.floatPrecision}
								</Text>
								<Slider
									min={0}
									max={8}
									step={1}
									size="sm"
									disabled={locked}
									value={settings.floatPrecision}
									onChange={onFloatPrecision}
									aria-label="Number precision"
								/>
							</Box>
							<Box>
								<Text size="xs" mb={4}>
									Transform precision {settings.transformPrecision}
								</Text>
								<Slider
									min={0}
									max={8}
									step={1}
									size="sm"
									disabled={locked}
									value={settings.transformPrecision}
									onChange={onTransformPrecision}
									aria-label="Transform precision"
								/>
							</Box>
							<Divider />
							<Text size="xs" c="dimmed">
								Features
							</Text>
							{SVG_PLUGINS.map((plugin) => (
								<Switch
									key={plugin.id}
									size="xs"
									disabled={locked}
									label={plugin.name}
									checked={Boolean(settings.plugins[plugin.id])}
									data-plugin-id={plugin.id}
									onChange={onPluginChange}
								/>
							))}
							<Button
								size="compact-xs"
								variant="subtle"
								color="gray"
								disabled={locked}
								onClick={onReset}
							>
								Reset all
							</Button>
						</Stack>
					</fieldset>
				</ScrollArea>
			</Box>
		</div>
	);
}

function Preview({ svg }: { svg: string }) {
	const stageRef = useRef<HTMLDivElement>(null);
	const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
	const [url, setUrl] = useState<string | null>(null);
	const { onDoubleClick, onPointerDown, onPointerMove, onPointerUp } =
		useSvgPreviewHandlers(transform, setTransform);

	useEffect(() => {
		const next = URL.createObjectURL(
			new Blob([svg], { type: "image/svg+xml" }),
		);
		setUrl(next);
		return () => URL.revokeObjectURL(next);
	}, [svg]);

	useEffect(() => {
		const stage = stageRef.current;
		if (!stage) return;
		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
			setTransform((current) => ({
				...current,
				scale: Math.min(20, Math.max(0.1, current.scale * factor)),
			}));
		};
		stage.addEventListener("wheel", onWheel, { passive: false });
		return () => stage.removeEventListener("wheel", onWheel);
	}, []);

	return (
		<div
			ref={stageRef}
			className={styles.stage}
			role="application"
			aria-label="SVG preview. Drag to pan, scroll to zoom, double-click to reset."
			onDoubleClick={onDoubleClick}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
		>
			{url ? (
				<img
					className={styles.image}
					alt="SVG preview"
					src={url}
					draggable={false}
					style={{
						transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
					}}
				/>
			) : null}
		</div>
	);
}

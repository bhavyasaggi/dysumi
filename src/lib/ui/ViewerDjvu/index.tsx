import { Button, Center, Group, Loader, ScrollArea, Text } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDjvuWorkerApi } from "@/lib/djvu-worker-api";
import type { DjvuPageWire } from "@/lib/workers/djvu-worker";
import styles from "./styles.module.scss";

interface DjvuPage {
	width: number;
	height: number;
	pixels: Uint8ClampedArray<ArrayBuffer>;
	text: string;
	count: number;
}

function canvasPixels(pixels: Uint8Array): Uint8ClampedArray<ArrayBuffer> {
	const copy = new Uint8ClampedArray(pixels.length);
	copy.set(pixels);
	return copy;
}

function pageFrom(wire: DjvuPageWire): DjvuPage {
	return {
		width: wire.width,
		height: wire.height,
		pixels: canvasPixels(wire.pixels),
		text: wire.text,
		count: wire.count,
	};
}

function paintPage(canvas: HTMLCanvasElement | null, page: DjvuPage | null) {
	if (!(canvas && page)) return;
	canvas.width = page.width;
	canvas.height = page.height;
	canvas
		.getContext("2d")
		?.putImageData(new ImageData(page.pixels, page.width, page.height), 0, 0);
}

export default function ViewerDjvu({ bytes }: { bytes: Uint8Array }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const generationRef = useRef(0);
	const [attempt, setAttempt] = useState(0);
	const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState("");
	const [pageIndex, setPageIndex] = useState(0);
	const [page, setPage] = useState<DjvuPage | null>(null);
	const [rendering, setRendering] = useState(false);
	const retry = useCallback(() => {
		setAttempt((value) => value + 1);
	}, []);
	const previous = useCallback(() => {
		setPageIndex((value) => Math.max(0, value - 1));
	}, []);
	const next = useCallback(() => {
		setPageIndex((value) => value + 1);
	}, []);

	useEffect(() => {
		let cancelled = attempt < 0;
		const api = getDjvuWorkerApi();
		setPhase("loading");
		setError("");
		setPage(null);
		api
			.open(new Uint8Array(bytes))
			.then((opened) => {
				if (cancelled) {
					api.close(opened.generation).catch(() => undefined);
					return;
				}
				generationRef.current = opened.generation;
				setPageIndex(0);
				setPhase("ready");
			})
			.catch((reason: unknown) => {
				if (!cancelled) {
					setPhase("error");
					setError(reason instanceof Error ? reason.message : String(reason));
				}
			});
		return () => {
			cancelled = true;
			const current = generationRef.current;
			generationRef.current = 0;
			if (current) api.close(current).catch(() => undefined);
		};
	}, [attempt, bytes]);

	useEffect(() => {
		if (phase !== "ready") return;
		let cancelled = false;
		setRendering(true);
		getDjvuWorkerApi()
			.page({ generation: generationRef.current, index: pageIndex })
			.then((wire) => {
				if (!cancelled) setPage(pageFrom(wire));
			})
			.catch((reason: unknown) => {
				if (!cancelled) {
					setPhase("error");
					setError(reason instanceof Error ? reason.message : String(reason));
				}
			})
			.finally(() => {
				if (!cancelled) setRendering(false);
			});
		return () => {
			cancelled = true;
		};
	}, [pageIndex, phase]);

	useEffect(() => {
		paintPage(canvasRef.current, page);
	}, [page]);

	const count = page?.count ?? 0;
	return (
		<div className={styles.layout}>
			<Group className={styles.bar} justify="space-between">
				<Text size="sm">
					{count > 0
						? `Page ${Math.min(pageIndex + 1, count)} of ${count}`
						: "DjVu"}
				</Text>
				<Group gap="xs">
					<Button
						size="compact-sm"
						variant="default"
						disabled={pageIndex <= 0 || rendering}
						onClick={previous}
					>
						Previous
					</Button>
					<Button
						size="compact-sm"
						variant="default"
						disabled={count === 0 || pageIndex >= count - 1 || rendering}
						onClick={next}
					>
						Next
					</Button>
				</Group>
			</Group>
			{phase === "error" ? (
				<Center py="xl">
					<Group>
						<Text c="red" role="alert">
							{error}
						</Text>
						<Button variant="light" onClick={retry}>
							Try again
						</Button>
					</Group>
				</Center>
			) : (
				<ScrollArea className={styles.stage} scrollbars="xy">
					{phase === "loading" || (rendering && !page) ? (
						<Center py="xl" role="status" aria-label="Loading…">
							<Loader color="gray" />
						</Center>
					) : null}
					<canvas
						ref={canvasRef}
						className={styles.page}
						inert={!page || page.text ? true : undefined}
						role={page && !page.text ? "img" : undefined}
						aria-label={
							page && !page.text
								? `Page ${pageIndex + 1} of ${count}`
								: undefined
						}
					/>
					{page?.text ? <Text className={styles.text}>{page.text}</Text> : null}
				</ScrollArea>
			)}
		</div>
	);
}

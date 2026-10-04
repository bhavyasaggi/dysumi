import "@excalidraw/excalidraw/index.css";

import { Excalidraw, restore, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ImportedDataState } from "@excalidraw/excalidraw/data/types";
import { useComputedColorScheme } from "@mantine/core";
import { type ComponentProps, useCallback, useMemo, useRef } from "react";

const FRAME_STYLE = {
	width: "100%",
	height: "100%",
	minHeight: "calc(100dvh - 6.5rem)",
} as const;

function loadScene(raw: string) {
	const trimmed = raw.trim();
	if (!trimmed) {
		return restore({ elements: [], appState: {}, files: {} }, null, null);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		throw new Error("Excalidraw file is not valid JSON");
	}

	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("Excalidraw file is not a scene");
	}

	const data = parsed as ImportedDataState & { type?: string };
	if (data.type === "excalidrawlib") {
		throw new Error("This file is an Excalidraw library, not a drawing");
	}
	if (!Array.isArray(data.elements)) {
		throw new Error("Excalidraw file has no elements array");
	}

	const appState = {
		...(data.appState ?? {}),
	} as Record<string, unknown>;
	appState.collaborators = undefined;

	return restore(
		{
			elements: data.elements,
			appState: appState as ImportedDataState["appState"],
			files: data.files,
		},
		null,
		null,
	);
}

export default function EditorExcalidraw({
	defaultValue,
	onChange,
}: {
	defaultValue: string;
	onChange?: (value: string) => void;
}) {
	const colorScheme = useComputedColorScheme("light", {
		getInitialValueInEffect: true,
	});
	const scene = useMemo(() => {
		try {
			return { data: loadScene(defaultValue), error: null };
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : "Could not open file",
			};
		}
	}, [defaultValue]);

	const lastWritten = useRef<string | null>(null);
	const opened = useRef(false);
	const handleChange = useCallback<
		NonNullable<ComponentProps<typeof Excalidraw>["onChange"]>
	>(
		(elements, appState, files) => {
			const json = serializeAsJSON(elements, appState, files, "local");
			if (!opened.current) {
				opened.current = true;
				lastWritten.current = json;
				return;
			}
			if (json === lastWritten.current) return;
			lastWritten.current = json;
			onChange?.(json);
		},
		[onChange],
	);

	if (scene.error || !scene.data) {
		return (
			<div style={FRAME_STYLE}>
				<p>{scene.error ?? "Could not open file"}</p>
			</div>
		);
	}

	return (
		<div style={FRAME_STYLE}>
			<Excalidraw
				aiEnabled={false}
				initialData={{
					elements: scene.data.elements,
					appState: scene.data.appState,
					files: scene.data.files,
				}}
				theme={colorScheme === "dark" ? "dark" : "light"}
				onChange={handleChange}
			/>
		</div>
	);
}

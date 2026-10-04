import {
	type ChangeEvent,
	type Dispatch,
	type PointerEvent,
	type SetStateAction,
	useCallback,
	useRef,
} from "react";
import { defaultSvgSettings, type SvgOptimizeSettings } from "./plugins";

function errorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (error && typeof error === "object" && "error" in error) {
		return String((error as { error: unknown }).error);
	}
	return "Could not save";
}

type PreviewTransform = { scale: number; x: number; y: number };

export function useSvgPreviewHandlers(
	transform: PreviewTransform,
	setTransform: Dispatch<SetStateAction<PreviewTransform>>,
) {
	const drag = useRef<{
		x: number;
		y: number;
		px: number;
		py: number;
	} | null>(null);

	const onDoubleClick = useCallback(() => {
		setTransform({ scale: 1, x: 0, y: 0 });
	}, [setTransform]);

	const onPointerDown = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			drag.current = {
				x: transform.x,
				y: transform.y,
				px: event.clientX,
				py: event.clientY,
			};
			event.currentTarget.setPointerCapture(event.pointerId);
		},
		[transform.x, transform.y],
	);

	const onPointerMove = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			const start = drag.current;
			if (!start) return;
			setTransform((current) => ({
				...current,
				x: start.x + event.clientX - start.px,
				y: start.y + event.clientY - start.py,
			}));
		},
		[setTransform],
	);

	const onPointerUp = useCallback(() => {
		drag.current = null;
	}, []);

	return { onDoubleClick, onPointerDown, onPointerMove, onPointerUp };
}

export function useEditorSvgHandlers({
	locked,
	settings,
	setSettings,
	output,
	onSave,
	onRefresh,
	setSaving,
	setSaveError,
	setLocked,
}: {
	locked: boolean;
	settings: SvgOptimizeSettings;
	setSettings: Dispatch<SetStateAction<SvgOptimizeSettings>>;
	output: string | null;
	onSave: (svg: string) => Promise<void>;
	onRefresh: () => Promise<void>;
	setSaving: Dispatch<SetStateAction<boolean>>;
	setSaveError: Dispatch<SetStateAction<string | null>>;
	setLocked: Dispatch<SetStateAction<boolean>>;
}) {
	const update = useCallback(
		(patch: Partial<SvgOptimizeSettings>) => {
			if (locked) return;
			setSettings((current) => ({ ...current, ...patch }));
		},
		[locked, setSettings],
	);

	const onSaveClick = useCallback(async () => {
		if (locked || !output) return;
		setSaving(true);
		setSaveError(null);
		try {
			await onSave(output);
			setLocked(true);
		} catch (error) {
			setSaveError(errorMessage(error));
		} finally {
			setSaving(false);
		}
	}, [locked, onSave, output, setLocked, setSaveError, setSaving]);

	const onRefreshClick = useCallback(async () => {
		try {
			await onRefresh();
		} catch (error) {
			setSaveError(errorMessage(error));
		}
	}, [onRefresh, setSaveError]);

	const onShowOriginal = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			update({ showOriginal: event.currentTarget.checked });
		},
		[update],
	);

	const onCompareGzip = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			update({ compareGzip: event.currentTarget.checked });
		},
		[update],
	);

	const onPretty = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			update({ pretty: event.currentTarget.checked });
		},
		[update],
	);

	const onMultipass = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			update({ multipass: event.currentTarget.checked });
		},
		[update],
	);

	const onFloatPrecision = useCallback(
		(value: number) => {
			update({ floatPrecision: value });
		},
		[update],
	);

	const onTransformPrecision = useCallback(
		(value: number) => {
			update({ transformPrecision: value });
		},
		[update],
	);

	const onPluginChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const id = event.currentTarget.dataset.pluginId;
			if (!id) return;
			update({
				plugins: {
					...settings.plugins,
					[id]: event.currentTarget.checked,
				},
			});
		},
		[settings.plugins, update],
	);

	const onReset = useCallback(() => {
		setSettings(defaultSvgSettings());
	}, [setSettings]);

	return {
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
	};
}

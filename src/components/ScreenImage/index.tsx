import { Center, Loader, Stack, Text } from "@mantine/core";
import { useThrottledCallback } from "@mantine/hooks";
import { useCallback, useMemo, useRef } from "react";
import {
	askSaveAs,
	saveDetail,
	useFileSaveKeys,
} from "@/components/EditorApp/shortcuts";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import {
	useReadWebFsFileBinaryQuery,
	useWriteWebFsFileBinaryMutation,
} from "@/lib/redux/queries/web-fs/read-write";
import {
	actionInterfaceOpenFile,
	actionInterfacePushNotification,
	selectorInterfaceGetActiveFile,
	selectorInterfaceGetWorkspacePath,
} from "@/lib/redux/slices/interface";
import EditorImage from "@/lib/ui/EditorImage";

// Helper to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
	// Remove data URL prefix if present
	const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
	const binaryString = atob(base64Data);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
}

// Helper to convert Uint8Array to base64 string
function uint8ArrayToBase64(data: Uint8Array): string {
	let binary = "";
	const chunkSize = 8192; // Process in chunks to avoid call stack issues
	for (let i = 0; i < data.length; i += chunkSize) {
		const chunk = data.subarray(i, Math.min(i + chunkSize, data.length));
		binary += String.fromCharCode(...chunk);
	}
	return btoa(binary);
}

// Helper to create data URL from Uint8Array
// Using data URL instead of blob URL for better compatibility with image editors
function createImageDataUrl(data: Uint8Array, mimeType: string): string {
	const base64 = uint8ArrayToBase64(data);
	return `data:${mimeType};base64,${base64}`;
}

// Hoisted — avoids re-creating on every call
const IMAGE_MIME_TYPES: Record<string, string> = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	gif: "image/gif",
	webp: "image/webp",
	bmp: "image/bmp",
	ico: "image/x-icon",
	tiff: "image/tiff",
	tif: "image/tiff",
	avif: "image/avif",
	heic: "image/heic",
	heif: "image/heif",
};

function getMimeType(path: string): string {
	const ext = path.split(".").pop()?.toLowerCase() || "";
	return IMAGE_MIME_TYPES[ext] || "image/png";
}

export default function ScreenImage() {
	const dispatch = useReduxDispatch();
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const workspace = useReduxSelector(selectorInterfaceGetWorkspacePath);

	const fileWithProto = Boolean(activeFile?.path?.includes(":"));
	const isUntitledImage = activeFile?.path?.startsWith("untitled:");

	const {
		currentData: webFsFile,
		error: webFsFileError,
		isUninitialized: isUninitializedWebFsFile,
		isLoading: isLoadingWebFsFile,
		isError: isErrorWebFsFile,
	} = useReadWebFsFileBinaryQuery(
		{
			path: activeFile?.path || "",
		},
		{ skip: fileWithProto || isUntitledImage },
	);

	const latest = useRef<Uint8Array | null>(null);
	const loadedFor = useRef<string | null>(null);
	const path = activeFile?.path;
	if (loadedFor.current !== (path ?? null)) {
		loadedFor.current = path ?? null;
		latest.current = null;
	}
	if (latest.current === null && webFsFile?.content) {
		latest.current = webFsFile.content;
	}
	const [writeWebFsFileBinaryMutation] = useWriteWebFsFileBinaryMutation();
	const writeNow = useCallback(
		async (target: string, content: Uint8Array) => {
			const name = target.split("/").pop() || target;
			try {
				await writeWebFsFileBinaryMutation({
					path: target,
					content: new Uint8Array(content),
				}).unwrap();
				dispatch(
					actionInterfacePushNotification({
						key: `save:${target}`,
						tone: "success",
						title: `Saved ${name}`,
					}),
				);
			} catch (error) {
				dispatch(
					actionInterfacePushNotification({
						key: `save:${target}`,
						tone: "error",
						title: `Could not save ${name}`,
						detail: saveDetail(error),
					}),
				);
			}
		},
		[dispatch, writeWebFsFileBinaryMutation],
	);
	const writeWebFsFileBinaryMutationThrottled = useThrottledCallback(
		(content: Uint8Array) => {
			if (!path || path.includes(":")) return;
			writeNow(path, content).catch(() => undefined);
		},
		2000,
	);
	const save = useCallback(async () => {
		if (latest.current == null || !path) return;
		if (path.includes(":")) {
			const chosen = askSaveAs(dispatch, { currentPath: path, workspace });
			if (!chosen) return;
			await writeNow(chosen.path, latest.current);
			dispatch(
				actionInterfaceOpenFile({ name: chosen.name, path: chosen.path }),
			);
			return;
		}
		await writeNow(path, latest.current);
	}, [dispatch, path, workspace, writeNow]);
	const saveAs = useCallback(async () => {
		if (latest.current == null || !path) return;
		const chosen = askSaveAs(dispatch, { currentPath: path, workspace });
		if (!chosen) return;
		await writeNow(chosen.path, latest.current);
		dispatch(actionInterfaceOpenFile({ name: chosen.name, path: chosen.path }));
	}, [dispatch, path, workspace, writeNow]);
	useFileSaveKeys({ save, saveAs });

	// Derive image data URL from binary content — no effect needed
	const imageUrl = useMemo(() => {
		if (!webFsFile?.content || webFsFile.content.length === 0) return null;
		const mimeType = getMimeType(activeFile?.path || "");
		return createImageDataUrl(webFsFile.content, mimeType);
	}, [webFsFile?.content, activeFile?.path]);

	const processing =
		(!(fileWithProto || isUntitledImage) && isUninitializedWebFsFile) ||
		isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	// Get file name and extension from path
	const { fileName, fileExtension } = useMemo(() => {
		const path = activeFile?.path || "";
		const name = path.split("/").pop() || "image";
		const ext = name.includes(".")
			? name.split(".").pop()?.toLowerCase() || ""
			: "";
		return { fileName: name, fileExtension: ext };
	}, [activeFile?.path]);

	// Handle save from editor — write directly to the filesystem handle
	const handleSave = useCallback(
		(imageData: {
			imageBase64: string;
			mimeType: string;
			width: number;
			height: number;
			fullName?: string;
		}) => {
			const binaryData = base64ToUint8Array(imageData.imageBase64);
			latest.current = binaryData;
			writeWebFsFileBinaryMutationThrottled(binaryData);
		},
		[writeWebFsFileBinaryMutationThrottled],
	);

	if (processing) {
		return (
			<Center py="xl" px="sm" h="100%" role="status" aria-label="Loading…">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}

	if (error && !isUntitledImage) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Stack align="center" gap="sm">
					<Text c="red" role="alert">
						Error: {error}
					</Text>
				</Stack>
			</Center>
		);
	}

	if (!(imageUrl || isUntitledImage)) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No image to display</Text>
			</Center>
		);
	}

	return (
		<EditorImage
			key={activeFile?.path}
			src={imageUrl ? imageUrl : undefined}
			fileName={fileName}
			fileExtension={fileExtension}
			onSave={handleSave}
			readOnly={false}
		/>
	);
}

import { Center, Loader, Stack, Text } from "@mantine/core";
import { useThrottledCallback } from "@mantine/hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import {
	useEditWebFsFileBinaryMutation,
	useReadWebFsFileBinaryQuery,
} from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
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

// Determine mime type from file path
function getMimeType(path: string): string {
	const ext = path.split(".").pop()?.toLowerCase() || "";
	const mimeTypes: Record<string, string> = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		webp: "image/webp",
		svg: "image/svg+xml",
		bmp: "image/bmp",
		ico: "image/x-icon",
		tiff: "image/tiff",
		tif: "image/tiff",
		avif: "image/avif",
		heic: "image/heic",
		heif: "image/heif",
	};
	return mimeTypes[ext] || "image/png";
}

export default function ScreenImage() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const [imageUrl, setImageUrl] = useState<string | null>(null);

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

	const [editWebFsFileBinaryMutation] = useEditWebFsFileBinaryMutation();
	const editWebFsFileBinaryMutationThrottled = useThrottledCallback(
		async (content: Uint8Array) => {
			if (!activeFile?.path) {
				return;
			}
			try {
				const contentCopy = new Uint8Array(content);
				await editWebFsFileBinaryMutation({
					path: activeFile.path,
					content: contentCopy,
				}).unwrap();
			} catch (error) {
				console.error(error);
			}
		},
		2000,
	);

	// Create image data URL from binary data
	// Using data URL instead of blob URL for better compatibility with the image editor
	useEffect(() => {
		if (webFsFile?.content && webFsFile.content.length > 0) {
			const mimeType = getMimeType(activeFile?.path || "");
			const dataUrl = createImageDataUrl(webFsFile.content, mimeType);
			setImageUrl(dataUrl);
		}
	}, [webFsFile?.content, activeFile?.path]);

	const processing =
		(!fileWithProto && !isUntitledImage && isUninitializedWebFsFile) ||
		isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	// Get file name and extension from path
	const { fileName, fileExtension } = useMemo(() => {
		const path = activeFile?.path || "";
		const name = path.split("/").pop() || "image";
		const ext = name.includes(".") ? name.split(".").pop()?.toLowerCase() || "" : "";
		return { fileName: name, fileExtension: ext };
	}, [activeFile?.path]);

	// Handle save from editor
	const handleSave = useCallback(
		(imageData: {
			imageBase64: string;
			mimeType: string;
			width: number;
			height: number;
			fullName: string;
		}) => {
			// Convert base64 to binary and save
			const binaryData = base64ToUint8Array(imageData.imageBase64);
			editWebFsFileBinaryMutationThrottled(binaryData);
		},
		[editWebFsFileBinaryMutationThrottled],
	);

	if (processing) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}

	if (error && !isUntitledImage) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Stack align="center" gap="sm">
					<Text c="red">Error: {error}</Text>
				</Stack>
			</Center>
		);
	}

	if (!imageUrl && !isUntitledImage) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No image to display</Text>
			</Center>
		);
	}

	return (
		<EditorImage
			key={activeFile?.path}
			src={imageUrl || undefined}
			fileName={fileName}
			fileExtension={fileExtension}
			onSave={handleSave}
			readOnly={false}
		/>
	);
}
import { Center, Loader, Stack, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileBinaryQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import ViewerMedia from "@/lib/ui/ViewerMedia";

// Get MIME type from file extension
function getMimeType(path: string): string {
	const ext = path.split(".").pop()?.toLowerCase() || "";
	const mimeTypes: Record<string, string> = {
		// Video
		mp4: "video/mp4",
		webm: "video/webm",
		ogg: "video/ogg",
		ogv: "video/ogg",
		mov: "video/quicktime",
		avi: "video/x-msvideo",
		mkv: "video/x-matroska",
		m4v: "video/x-m4v",
		"3gp": "video/3gpp",
		// Audio
		mp3: "audio/mpeg",
		wav: "audio/wav",
		m4a: "audio/mp4",
		aac: "audio/aac",
		flac: "audio/flac",
		wma: "audio/x-ms-wma",
		aiff: "audio/aiff",
		opus: "audio/opus",
		oga: "audio/ogg",
	};
	return mimeTypes[ext] || "application/octet-stream";
}

// Detect media type from extension
function getMediaType(path: string): "audio" | "video" {
	const ext = path.split(".").pop()?.toLowerCase() || "";
	const audioExtensions = new Set([
		"mp3", "wav", "ogg", "oga", "m4a", "flac", "aac", "wma", "aiff", "opus",
	]);
	return audioExtensions.has(ext) ? "audio" : "video";
}

export default function ScreenMedia() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const [mediaUrl, setMediaUrl] = useState<string | null>(null);

	const fileWithProto = Boolean(activeFile?.path?.includes(":"));
	const isUntitledMedia = activeFile?.path?.startsWith("untitled:");

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
		{ skip: fileWithProto || isUntitledMedia },
	);

	const processing =
		(!fileWithProto && !isUntitledMedia && isUninitializedWebFsFile) ||
		isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	// Get file name and MIME type
	const fileName = useMemo(() => {
		const path = activeFile?.path || "";
		return path.split("/").pop() || "media";
	}, [activeFile?.path]);

	const mimeType = useMemo(
		() => getMimeType(activeFile?.path || ""),
		[activeFile?.path],
	);

	const mediaType = useMemo(
		() => getMediaType(activeFile?.path || ""),
		[activeFile?.path],
	);

	// Create blob URL from binary data
	useEffect(() => {
		if (webFsFile?.content && webFsFile.content.length > 0) {
			const blob = new Blob([webFsFile.content], { type: mimeType });
			const url = URL.createObjectURL(blob);
			setMediaUrl(url);

			return () => {
				URL.revokeObjectURL(url);
			};
		}
	}, [webFsFile?.content, mimeType]);

	if (processing) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}

	if (error && !isUntitledMedia) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Stack align="center" gap="sm">
					<Text c="red">Error: {error}</Text>
				</Stack>
			</Center>
		);
	}

	if (!mediaUrl) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No media to display</Text>
			</Center>
		);
	}

	return (
		<ViewerMedia
			key={activeFile?.path}
			src={mediaUrl}
			fileName={fileName}
			type={mediaType}
			mimeType={mimeType}
		/>
	);
}
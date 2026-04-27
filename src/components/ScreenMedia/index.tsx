import { Center, Loader, Stack, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileBinaryQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";

import ViewerMedia from "@/lib/ui/ViewerMedia";

// Hoisted — avoids re-creating on every call
const MEDIA_MIME_TYPES: Record<string, string> = {
	mp4: "video/mp4",
	webm: "video/webm",
	ogg: "video/ogg",
	ogv: "video/ogg",
	mov: "video/quicktime",
	avi: "video/x-msvideo",
	mkv: "video/x-matroska",
	m4v: "video/x-m4v",
	"3gp": "video/3gpp",
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

const AUDIO_EXTS = new Set([
	"mp3",
	"wav",
	"ogg",
	"oga",
	"m4a",
	"flac",
	"aac",
	"wma",
	"aiff",
	"opus",
]);

function getMimeType(path: string): string {
	const ext = path.split(".").pop()?.toLowerCase() || "";
	return MEDIA_MIME_TYPES[ext] || "application/octet-stream";
}

function getMediaType(path: string): "audio" | "video" {
	const ext = path.split(".").pop()?.toLowerCase() || "";
	return AUDIO_EXTS.has(ext) ? "audio" : "video";
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
		(!(fileWithProto || isUntitledMedia) && isUninitializedWebFsFile) ||
		isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	const mimeType = useMemo(
		() => getMimeType(activeFile?.path || ""),
		[activeFile?.path],
	);

	const mediaType = useMemo(
		() => getMediaType(activeFile?.path || ""),
		[activeFile?.path],
	);

	// Create blob URL from binary data
	const webFsFileContent = webFsFile?.content;
	useEffect(() => {
		let localUrl: string | undefined;
		if (webFsFileContent && webFsFileContent.length > 0) {
			const blob = new Blob([webFsFileContent as BlobPart], {
				type: mimeType,
			});
			localUrl = URL.createObjectURL(blob);
			setMediaUrl(localUrl);
		}

		return () => {
			if (localUrl) {
				URL.revokeObjectURL(localUrl);
			}
		};
	}, [webFsFileContent, mimeType]);

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

	return <ViewerMedia key={activeFile?.path} src={mediaUrl} type={mediaType} />;
}

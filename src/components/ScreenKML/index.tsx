import { Center, Loader, Stack, Text } from "@mantine/core";
import JSZip from "jszip";
import { useEffect, useMemo, useState } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import {
	useReadWebFsFileBinaryQuery,
	useReadWebFsFileQuery,
} from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import ViewerKML from "@/lib/ui/ViewerKML";

function isKmz(path: string): boolean {
	return path.split(".").pop()?.toLowerCase() === "kmz";
}

function resolveError(
	isError: boolean,
	error: unknown,
	fallback: string | null,
): string | undefined {
	if (isError) return String((error as Error)?.message);
	if (fallback) return fallback;
	return undefined;
}

export default function ScreenKML() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const filePath = activeFile?.path ?? "";
	const kmz = useMemo(() => isKmz(filePath), [filePath]);

	const fileWithProto = Boolean(filePath.includes(":"));
	const isUntitled = filePath.startsWith("untitled:");
	const skipFetch = fileWithProto || isUntitled;

	// KML: read as text
	const {
		currentData: textData,
		error: textError,
		isUninitialized: textUninit,
		isLoading: textLoading,
		isError: textIsError,
	} = useReadWebFsFileQuery({ path: filePath }, { skip: kmz || skipFetch });

	// KMZ: read as binary
	const {
		currentData: binaryData,
		error: binaryError,
		isUninitialized: binaryUninit,
		isLoading: binaryLoading,
		isError: binaryIsError,
	} = useReadWebFsFileBinaryQuery(
		{ path: filePath },
		{ skip: !kmz || skipFetch },
	);

	// Extract KML string from KMZ zip
	const [extractedKml, setExtractedKml] = useState<string | null>(null);
	const [extractError, setExtractError] = useState<string | null>(null);

	const binaryContent = binaryData?.content;
	useEffect(() => {
		if (!(kmz && binaryContent) || binaryContent.length === 0) return;

		let cancelled = false;
		(async () => {
			try {
				const zip = await JSZip.loadAsync(binaryContent);
				const kmlFile = zip.file(/\.kml$/i)[0] ?? zip.file(/doc\.kml$/i)[0];
				if (!kmlFile) {
					if (!cancelled)
						setExtractError("No KML file found inside KMZ archive");
					return;
				}
				const content = await kmlFile.async("string");
				if (!cancelled) setExtractedKml(content);
			} catch (e) {
				if (!cancelled)
					setExtractError(
						`Failed to extract KMZ: ${e instanceof Error ? e.message : String(e)}`,
					);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [kmz, binaryContent]);

	const kmlString = kmz ? extractedKml : (textData?.content ?? null);

	const processing = kmz
		? (!skipFetch && binaryUninit) ||
			binaryLoading ||
			(binaryData && !extractedKml && !extractError)
		: (!skipFetch && textUninit) || textLoading;

	const error = kmz
		? resolveError(binaryIsError, binaryError, extractError)
		: resolveError(textIsError, textError, null);

	if (processing) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}

	if (error && !isUntitled) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Stack align="center" gap="sm">
					<Text c="red">Error: {error}</Text>
				</Stack>
			</Center>
		);
	}

	if (!kmlString) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No KML data to display</Text>
			</Center>
		);
	}

	return <ViewerKML key={activeFile?.path} kmlString={kmlString} />;
}

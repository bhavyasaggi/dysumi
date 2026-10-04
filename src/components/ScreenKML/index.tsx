import { Center, Loader, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import {
	parseQueryError,
	useParseGeoQuery,
	useParseKmzQuery,
} from "@/lib/redux/queries/parse";
import {
	useReadWebFsFileBinaryQuery,
	useReadWebFsFileQuery,
} from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import ViewerKML from "@/lib/ui/ViewerKML";
import { geoDocumentFromWire } from "@/lib/utils/geo/document";

const EMPTY_BYTES = new Uint8Array();

type GeoKind = "kml" | "kmz" | "tcx" | "geojson";

function geoKind(path: string): GeoKind {
	const extension = path.split(".").pop()?.toLowerCase();
	if (extension === "kmz") return "kmz";
	if (extension === "tcx") return "tcx";
	if (extension === "geojson") return "geojson";
	return "kml";
}

function textGeoKind(kind: GeoKind): "kml" | "tcx" | "geojson" {
	if (kind === "tcx" || kind === "geojson") return kind;
	return "kml";
}

function errorText(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function useKmlScreen(filePath: string) {
	const kind = useMemo(() => geoKind(filePath), [filePath]);

	const fileWithProto = Boolean(filePath.includes(":"));
	const isUntitled = filePath.startsWith("untitled:");
	const skipFetch = fileWithProto || isUntitled;
	const binary = kind === "kmz";

	const {
		currentData: textData,
		error: textError,
		isUninitialized: textUninit,
		isLoading: textLoading,
		isError: textIsError,
	} = useReadWebFsFileQuery({ path: filePath }, { skip: binary || skipFetch });

	const {
		currentData: binaryData,
		error: binaryError,
		isUninitialized: binaryUninit,
		isLoading: binaryLoading,
		isError: binaryIsError,
	} = useReadWebFsFileBinaryQuery(
		{ path: filePath },
		{ skip: !binary || skipFetch },
	);

	const textContent = textData?.content;
	const binaryContent = binaryData?.content;
	const textKind = textGeoKind(kind);
	const geo = useParseGeoQuery(
		{ text: textContent ?? "", geoKind: textKind },
		{ skip: binary || !textContent },
	);
	const kmz = useParseKmzQuery(
		{ bytes: binaryContent ?? EMPTY_BYTES },
		{ skip: !(binary && binaryContent) || binaryContent.length === 0 },
	);
	const wire = binary ? kmz.data : geo.data;
	const parseFailed = binary ? kmz.isError : geo.isError;
	const parseError = binary ? kmz.error : geo.error;
	const parsing =
		(binary ? Boolean(binaryContent?.length) : Boolean(textContent)) &&
		!wire &&
		!parseFailed;
	const document = useMemo(
		() => (wire ? geoDocumentFromWire(wire) : null),
		[wire],
	);

	const processing = binary
		? (!skipFetch && binaryUninit) || binaryLoading || parsing
		: (!skipFetch && textUninit) || textLoading || parsing;
	let readError: string | undefined;
	if (binary && binaryIsError) {
		readError = errorText(binaryError);
	} else if (!binary && textIsError) {
		readError = errorText(textError);
	}
	const parseMessage = parseFailed
		? parseQueryError(parseError, "Could not read this map")
		: undefined;
	const error = readError ? readError : parseMessage;
	return { document, processing, error, isUntitled };
}

export default function ScreenKML() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const view = useKmlScreen(activeFile?.path ?? "");
	const { document, processing, error, isUntitled } = view;

	if (processing) {
		return (
			<Center py="xl" px="sm" h="100%" role="status" aria-label="Loading…">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}

	if (error && !isUntitled) {
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

	if (!document) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No geographic data to display</Text>
			</Center>
		);
	}

	return <ViewerKML key={activeFile?.path} document={document} />;
}

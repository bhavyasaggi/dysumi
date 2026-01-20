import { Center, Loader } from "@mantine/core";
import React, { Suspense, useContext, useDeferredValue } from "react";
import { DynamicContext } from "@/components/DynamicBoundary/context";
import { useReduxSelector } from "@/lib/redux/hooks";
import {
	selectorInterfaceGetActiveFile,
	selectorInterfaceGetIsReady,
} from "@/lib/redux/slices/interface";

const ScreenHex = React.lazy(() => import("@/components/ScreenHex"));
const ScreenCode = React.lazy(() => import("@/components/ScreenCode"));
const ScreenMarkdown = React.lazy(() => import("@/components/ScreenMarkdown"));
const ScreenImage = React.lazy(() => import("@/components/ScreenImage"));
const ScreenPdf = React.lazy(() => import("@/components/ScreenPdf"));
const ScreenMedia = React.lazy(() => import("@/components/ScreenMedia"));
const ScreenCalendar = React.lazy(() => import("@/components/ScreenCalendar"));

// Binary/hex file extensions that should use the hex editor
const HEX_EXTENSIONS = new Set([
	"bin",
	"dat",
	"exe",
	"dll",
	"so",
	"dylib",
	"o",
	"obj",
	"a",
	"lib",
	"rom",
	"iso",
	"raw",
	"hex",
	"dmp",
	"core",
]);

// Image file extensions supported by the image editor
const IMAGE_EXTENSIONS = new Set([
	"jpg",
	"jpeg",
	"png",
	"gif",
	"webp",
	"svg",
	"ico",
	"tiff",
	"tif",
	"bmp",
	"avif",
	"heic",
	"heif",
]);

// PDF file extension
const PDF_EXTENSIONS = new Set(["pdf"]);

// Video file extensions
const VIDEO_EXTENSIONS = new Set([
	"mp4",
	"webm",
	"ogg",
	"ogv",
	"mov",
	"avi",
	"mkv",
	"m4v",
	"3gp",
	"wmv",
	"flv",
]);

// Audio file extensions
const AUDIO_EXTENSIONS = new Set([
	"mp3",
	"wav",
	"m4a",
	"aac",
	"flac",
	"wma",
	"aiff",
	"opus",
	"oga",
	"ogg",
]);

// Calendar file extensions (iCalendar and vCalendar)
const CALENDAR_EXTENSIONS = new Set([
	"ics",  // iCalendar format
	"vcs",  // vCalendar format (legacy)
	"ical",
	"ifb",  // Free/Busy data
]);

export function meta() {
	return [{ title: "dysumi" }, { name: "description", content: "Welcome!" }];
}

export default function RouteEditorAppIndex() {
	const { clientReady } = useContext(DynamicContext);
	const interfaceReady = useReduxSelector(selectorInterfaceGetIsReady);
	const isReady = clientReady && interfaceReady;

	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const activeFileDeferred = useDeferredValue(activeFile, undefined);

	let Component:
		| undefined
		// biome-ignore lint/suspicious/noExplicitAny: Accept any component
		| ((props: any) => React.JSX.Element)
		// biome-ignore lint/suspicious/noExplicitAny: Accept any component
		| React.LazyExoticComponent<(props: any) => React.JSX.Element>;

	// Check for explicit mode overrides first
	if (!Component) {
		switch (activeFile?.mode) {
			case "hex":
				Component = ScreenHex;
				break;
			default:
				break;
		}
	}

	// Determine component based on file extension
	if (!Component) {
		const format =
			String(activeFile?.path || "")
				.split(".")
				.pop()
				?.trim()
				.toLowerCase() || "";

		// Check each file type category
		if (format === "md") {
			Component = ScreenMarkdown;
		} else if (IMAGE_EXTENSIONS.has(format)) {
			Component = ScreenImage;
		} else if (PDF_EXTENSIONS.has(format)) {
			Component = ScreenPdf;
		} else if (VIDEO_EXTENSIONS.has(format) || AUDIO_EXTENSIONS.has(format)) {
			Component = ScreenMedia;
		} else if (CALENDAR_EXTENSIONS.has(format)) {
			Component = ScreenCalendar;
		} else if (HEX_EXTENSIONS.has(format)) {
			Component = ScreenHex;
		} else if (["csv", "json", "yaml", "yml"].includes(format)) {
			// TODO: Implement data viewer
			Component = () => <>MainData</>;
		}
	}

	// Default fallback to code editor
	if (!Component) {
		Component = ScreenCode;
	}

	return (
		<Suspense
			fallback={
				<Center py="xl" px="sm">
					<Loader size="xl" type="dots" color="gray" />
				</Center>
			}
		>
			{isReady || activeFile !== activeFileDeferred ? (
				<Component key={activeFile?.path || "untitled"} />
			) : (
				<Center py="xl" px="sm">
					<Loader size="xl" type="dots" color="gray" />
				</Center>
			)}
		</Suspense>
	);
}

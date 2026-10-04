import { Center, Loader } from "@mantine/core";
import React, { useCallback, useDeferredValue } from "react";
import InterfaceShell, {
	type InterfaceShellProps,
} from "@/components/InterfaceShell";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import {
	AUDIO_EXTENSIONS,
	CALENDAR_EXTENSIONS,
	CATALOG_EXTENSIONS,
	CHM_EXTENSIONS,
	DJVU_EXTENSIONS,
	EPUB_EXTENSIONS,
	EXCALIDRAW_EXTENSIONS,
	FB2_EXTENSIONS,
	FINANCE_EXTENSIONS,
	GRAPHQL_EXTENSIONS,
	HAR_EXTENSIONS,
	HEX_EXTENSIONS,
	IMAGE_EXTENSIONS,
	JOSE_EXTENSIONS,
	KML_EXTENSIONS,
	MAIL_EXTENSIONS,
	MARKDOWN_EXTENSIONS,
	MERMAID_EXTENSIONS,
	MIDI_EXTENSIONS,
	PDF_EXTENSIONS,
	REST_EXTENSIONS,
	SVG_EXTENSIONS,
	TABULAR_EXTENSIONS,
	TEX_EXTENSIONS,
	TORRENT_EXTENSIONS,
	VCARD_EXTENSIONS,
	VIDEO_EXTENSIONS,
} from "@/lib/data/extensions";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import {
	useListWebFsNamesQuery,
	useResumeWebFsWorkspaceQuery,
} from "@/lib/redux/queries/web-fs/meta";
import { useResumeWebLlmModelQuery } from "@/lib/redux/queries/web-llm";
import {
	actionInterfaceUpdate,
	selectorInterfaceGetActiveFile,
	selectorInterfaceGetIsReady,
	selectorInterfaceGetViewPanel,
	selectorInterfaceGetWorkspacePath,
} from "@/lib/redux/slices/interface";
import { useEditorShortcuts } from "./shortcuts";

const ScreenHex = React.lazy(() => import("@/components/ScreenHex"));
const ScreenCode = React.lazy(() => import("@/components/ScreenCode"));
const ScreenMarkdown = React.lazy(() => import("@/components/ScreenMarkdown"));
const ScreenImage = React.lazy(() => import("@/components/ScreenImage"));
const ScreenPdf = React.lazy(() => import("@/components/ScreenPdf"));
const ScreenMedia = React.lazy(() => import("@/components/ScreenMedia"));
const ScreenSchedule = React.lazy(() => import("@/components/ScreenSchedule"));
const ScreenPaint = React.lazy(() => import("@/components/ScreenPaint"));
const ScreenEPub = React.lazy(() => import("@/components/ScreenEPub"));
const ScreenRest = React.lazy(() => import("@/components/ScreenRest"));
const ScreenGraphQL = React.lazy(() => import("@/components/ScreenGraphQL"));
const ScreenSV = React.lazy(() => import("@/components/ScreenSV"));
const ScreenKML = React.lazy(() => import("@/components/ScreenKML"));
const ScreenMail = React.lazy(() => import("@/components/ScreenMail"));
const ScreenHar = React.lazy(() => import("@/components/ScreenHar"));
const ScreenFinance = React.lazy(() => import("@/components/ScreenFinance"));
const ScreenExcalidraw = React.lazy(
	() => import("@/components/ScreenExcalidraw"),
);
const ScreenDiagram = React.lazy(() => import("@/components/ScreenDiagram"));
const ScreenSvg = React.lazy(() => import("@/components/ScreenSvg"));
const ScreenJose = React.lazy(() => import("@/components/ScreenJose"));
const ScreenTorrent = React.lazy(() => import("@/components/ScreenTorrent"));
const ScreenCatalog = React.lazy(() => import("@/components/ScreenCatalog"));
const ScreenVCard = React.lazy(() => import("@/components/ScreenVCard"));
const ScreenFb2 = React.lazy(() => import("@/components/ScreenFb2"));
const ScreenDjvu = React.lazy(() => import("@/components/ScreenDjvu"));
const ScreenChm = React.lazy(() => import("@/components/ScreenChm"));

const PanelExplorer = React.lazy(() => import("@/components/PanelExplorer"));
const PanelSearch = React.lazy(() => import("@/components/PanelSearch"));
const PanelWelcome = React.lazy(() => import("@/components/PanelWelcome"));
const PanelAssist = React.lazy(() => import("@/components/PanelAssist"));
const PanelSettings = React.lazy(() => import("@/components/PanelSettings"));

const panelData: InterfaceShellProps["panelData"] = [
	{
		id: "welcome",
		icon: "menu",
		title: "Welcome",
		Component: PanelWelcome,
	},
	{
		id: "explorer",
		icon: "layers",
		title: "Explorer",
		Component: PanelExplorer,
	},
	{
		id: "search",
		icon: "search",
		title: "Search",
		Component: PanelSearch,
	},
	{
		id: "web-llm",
		icon: "crosshair",
		title: "AI Assist",
		Component: PanelAssist,
	},
	{
		id: "settings",
		icon: "settings",
		title: "Settings",
		Component: PanelSettings,
	},
];

const FORMAT_SCREENS: [Set<string>, React.ComponentType][] = [
	[MARKDOWN_EXTENSIONS, ScreenMarkdown],
	[SVG_EXTENSIONS, ScreenSvg],
	[IMAGE_EXTENSIONS, ScreenImage],
	[PDF_EXTENSIONS, ScreenPdf],
	[VIDEO_EXTENSIONS, ScreenMedia],
	[AUDIO_EXTENSIONS, ScreenMedia],
	[CALENDAR_EXTENSIONS, ScreenSchedule],
	[EPUB_EXTENSIONS, ScreenEPub],
	[TEX_EXTENSIONS, ScreenCode],
	[REST_EXTENSIONS, ScreenRest],
	[GRAPHQL_EXTENSIONS, ScreenGraphQL],
	[TABULAR_EXTENSIONS, ScreenSV],
	[KML_EXTENSIONS, ScreenKML],
	[MAIL_EXTENSIONS, ScreenMail],
	[HAR_EXTENSIONS, ScreenHar],
	[FINANCE_EXTENSIONS, ScreenFinance],
	[EXCALIDRAW_EXTENSIONS, ScreenExcalidraw],
	[MERMAID_EXTENSIONS, ScreenDiagram],
	[JOSE_EXTENSIONS, ScreenJose],
	[TORRENT_EXTENSIONS, ScreenTorrent],
	[CATALOG_EXTENSIONS, ScreenCatalog],
	[VCARD_EXTENSIONS, ScreenVCard],
	[FB2_EXTENSIONS, ScreenFb2],
	[DJVU_EXTENSIONS, ScreenDjvu],
	[CHM_EXTENSIONS, ScreenChm],
	[MIDI_EXTENSIONS, ScreenMedia],
	[HEX_EXTENSIONS, ScreenHex],
];

function screenForFormat(format: string): React.ComponentType {
	if (format === "bmp") return ScreenPaint;
	for (const [extensions, screen] of FORMAT_SCREENS) {
		if (extensions.has(format)) return screen;
	}
	return ScreenCode;
}

function getComponent(mode: string, format: string): React.ComponentType {
	if (mode === "hex") return ScreenHex;
	return screenForFormat(format);
}

export default function EditorClient() {
	const dispatch = useReduxDispatch();
	useEditorShortcuts();
	const isReady = useReduxSelector(selectorInterfaceGetIsReady);

	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const activeFileDeferred = useDeferredValue(activeFile, undefined);

	const viewPanel = useReduxSelector(selectorInterfaceGetViewPanel);
	const workspace = useReduxSelector(selectorInterfaceGetWorkspacePath);
	useListWebFsNamesQuery({ path: workspace ?? "" }, { skip: !workspace });
	useResumeWebFsWorkspaceQuery({ path: workspace ?? "" }, { skip: !workspace });
	useResumeWebLlmModelQuery();
	const setViewPanel = useCallback(
		(view: string | undefined) => {
			dispatch(actionInterfaceUpdate({ viewPanel: view }));
		},
		[dispatch],
	);
	const handleSettings = useCallback(() => {
		dispatch(actionInterfaceUpdate({ viewPanel: "settings" }));
	}, [dispatch]);

	const Component = getComponent(
		activeFile?.mode || "",
		String(activeFile?.path || "")
			.split(".")
			.pop()
			?.trim()
			.toLowerCase() || "",
	);

	return (
		<InterfaceShell
			loading={!isReady}
			panel={viewPanel}
			panelData={panelData}
			onPanel={setViewPanel}
			onSettings={handleSettings}
		>
			<ScreenBoundary key={activeFile?.path || "untitled"}>
				<React.Suspense
					fallback={
						<Center py="xl" px="sm" role="status" aria-label="Loading…">
							<Loader size="xl" type="dots" color="gray" />
						</Center>
					}
				>
					{isReady || activeFile !== activeFileDeferred ? (
						<Component key={activeFile?.path || "untitled"} />
					) : (
						<Center py="xl" px="sm" role="status" aria-label="Loading…">
							<Loader size="xl" type="dots" color="gray" />
						</Center>
					)}
				</React.Suspense>
			</ScreenBoundary>
		</InterfaceShell>
	);
}

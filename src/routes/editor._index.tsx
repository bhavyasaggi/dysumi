import { Center, Loader } from "@mantine/core";
import React, { useCallback, useDeferredValue } from "react";
import InterfaceShell, {
	type InterfaceShellProps,
} from "@/components/InterfaceShell";
import PanelLoading from "@/components/PanelLoading";
import {
	AUDIO_EXTENSIONS,
	CALENDAR_EXTENSIONS,
	EPUB_EXTENSIONS,
	GRAPHQL_EXTENSIONS,
	HEX_EXTENSIONS,
	IMAGE_EXTENSIONS,
	KML_EXTENSIONS,
	MARKDOWN_EXTENSIONS,
	PDF_EXTENSIONS,
	REST_EXTENSIONS,
	TABULAR_EXTENSIONS,
	TEX_EXTENSIONS,
	VIDEO_EXTENSIONS,
} from "@/lib/data/extensions";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import {
	actionInterfaceUpdate,
	selectorInterfaceGetActiveFile,
	selectorInterfaceGetIsReady,
	selectorInterfaceGetViewPanel,
} from "@/lib/redux/slices/interface";

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

const PanelExplorer = React.lazy(() => import("@/components/PanelExplorer"));
const PanelSearch = React.lazy(() => import("@/components/PanelSearch"));
const PanelWelcome = React.lazy(() => import("@/components/PanelWelcome"));

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
		Component: PanelLoading,
	},
];

function getComponent(mode: string, format: string): React.ComponentType {
	if (mode === "hex") {
		return ScreenHex;
	} else if (format === "bmp") {
		return ScreenPaint;
	} else if (MARKDOWN_EXTENSIONS.has(format)) {
		return ScreenMarkdown;
	} else if (IMAGE_EXTENSIONS.has(format)) {
		return ScreenImage;
	} else if (PDF_EXTENSIONS.has(format)) {
		return ScreenPdf;
	} else if (VIDEO_EXTENSIONS.has(format) || AUDIO_EXTENSIONS.has(format)) {
		return ScreenMedia;
	} else if (CALENDAR_EXTENSIONS.has(format)) {
		return ScreenSchedule;
	} else if (EPUB_EXTENSIONS.has(format)) {
		return ScreenEPub;
	} else if (TEX_EXTENSIONS.has(format)) {
		return ScreenCode;
	} else if (REST_EXTENSIONS.has(format)) {
		return ScreenRest;
	} else if (GRAPHQL_EXTENSIONS.has(format)) {
		return ScreenGraphQL;
	} else if (TABULAR_EXTENSIONS.has(format)) {
		return ScreenSV;
	} else if (KML_EXTENSIONS.has(format)) {
		return ScreenKML;
	} else if (HEX_EXTENSIONS.has(format)) {
		return ScreenHex;
	}

	return ScreenCode;
}

// biome-ignore lint/style/useComponentExportOnlyModules: React Router convention
export function meta() {
	return [{ title: "dysumi" }, { name: "description", content: "Welcome!" }];
}

export default function RouteEditorAppIndex() {
	const dispatch = useReduxDispatch();
	const isReady = useReduxSelector(selectorInterfaceGetIsReady);

	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const activeFileDeferred = useDeferredValue(activeFile, undefined);

	const viewPanel = useReduxSelector(selectorInterfaceGetViewPanel);
	const setViewPanel = useCallback(
		(view: string | undefined) => {
			dispatch(actionInterfaceUpdate({ viewPanel: view }));
		},
		[dispatch],
	);

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
			onSettings={() => {
				/* not yet implemented */
			}}
		>
			<React.Suspense
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
			</React.Suspense>
		</InterfaceShell>
	);
}

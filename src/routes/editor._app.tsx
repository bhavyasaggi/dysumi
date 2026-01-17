import React, { Suspense, useCallback, useContext } from "react";
import { Outlet } from "react-router";
import ActivityBar from "@/components/ActivityBar";
import { DynamicContext } from "@/components/DynamicBoundary/context";
import InterfaceShell, {
	type InterfaceShellProps,
} from "@/components/InterfaceShell";
import PanelLoading from "@/components/PanelLoading";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import {
	actionInterfaceUpdate,
	selectorInterfaceGetIsReady,
	selectorInterfaceGetViewPanel,
} from "@/lib/redux/slices/interface";

const PanelExplorer = React.lazy(() => import("@/components/PanelExplorer"));
const PanelSearch = React.lazy(() => import("@/components/PanelSearch"));
const PanelWelcome = React.lazy(() => import("@/components/PanelWelcome"));

const Statusbar = React.lazy(() => import("@/components/Statusbar"));

const renderActivity = (
	_layout: string | undefined,
	options: {
		loading?: boolean;
	},
) => (
	<Suspense fallback={null}>
		{options.loading ? null : <ActivityBar />}
	</Suspense>
);
const renderFooter = (
	_layout: string | undefined,
	options: {
		loading?: boolean;
	},
) => (
	<Suspense fallback={null}>{options.loading ? null : <Statusbar />}</Suspense>
);

const panelData: InterfaceShellProps["panelData"] = [
	{
		id: "welcome",
		icon: "menu",
		title: "Welcome",
		render: (_layout, { loading }) => (
			<Suspense fallback={<PanelLoading />}>
				{loading ? <PanelLoading /> : <PanelWelcome />}
			</Suspense>
		),
	},
	{
		id: "explorer",
		icon: "layers",
		title: "Explorer",
		render: (_layout, { loading }) => (
			<Suspense fallback={<PanelLoading />}>
				{loading ? <PanelLoading /> : <PanelExplorer />}
			</Suspense>
		),
	},
	{
		id: "search",
		icon: "search",
		title: "Search",
		render: (_layout, { loading }) => (
			<Suspense fallback={<PanelLoading />}>
				{loading ? <PanelLoading /> : <PanelSearch />}
			</Suspense>
		),
	},
	{
		id: "web-llm",
		icon: "crosshair",
		title: "AI Assist",
		render: (_layout, { loading }) => (
			<Suspense fallback={<PanelLoading />}>
				{loading ? <PanelLoading /> : <PanelLoading />}
			</Suspense>
		),
	},
];

export default function RouteEditorApp() {
	const dispatch = useReduxDispatch();

	const { clientReady } = useContext(DynamicContext);
	const interfaceReady = useReduxSelector(selectorInterfaceGetIsReady);
	const isReady = clientReady && interfaceReady;

	const viewPanel = useReduxSelector(selectorInterfaceGetViewPanel);
	const setViewPanel = useCallback(
		(view: string | undefined) => {
			dispatch(actionInterfaceUpdate({ viewPanel: view }));
		},
		[dispatch],
	);

	return (
		<InterfaceShell
			loading={!isReady}
			panel={viewPanel}
			panelData={panelData}
			onPanel={setViewPanel}
			onSettings={() => {}}
			renderActivity={renderActivity}
			renderFooter={renderFooter}
		>
			<Outlet />
		</InterfaceShell>
	);
}

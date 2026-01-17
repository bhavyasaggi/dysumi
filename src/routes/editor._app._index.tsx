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

	if (!Component) {
		switch (activeFile?.mode) {
			case "hex":
				Component = ScreenHex;
				break;
			default:
				break;
		}
	}
	if (!Component) {
		// TODO: Mime types
		const format =
			String(activeFile?.path || "")
				.split(".")
				.pop()
				?.trim()
				.toLowerCase() || "";
		switch (format) {
			case "md":
				Component = ScreenMarkdown;
				break;
			case "csv":
			case "json":
			case "yaml":
			case "yml":
				Component = () => <>MainData</>;
				break;
			default:
				break;
		}
	}
	// Special Page Overrides
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

import { Center, Loader } from "@mantine/core";
import React from "react";
import { pageMeta } from "@/lib/seo";

function EditorPending() {
	return (
		<Center py="xl" px="sm" role="status" aria-label="Loading…">
			<Loader size="xl" type="dots" color="gray" />
		</Center>
	);
}

const EditorClient = React.lazy(() =>
	import.meta.env.SSR
		? Promise.resolve({ default: EditorPending })
		: import("@/components/EditorApp"),
);

// biome-ignore lint/style/useComponentExportOnlyModules: React Router convention
export function meta() {
	return pageMeta({
		title: "Editor · dysumi",
		description:
			"Open, view, and edit a file in the dysumi workspace. Files stay on your device.",
		path: "/editor",
	});
}

export default function RouteEditorAppIndex() {
	return (
		<React.Suspense fallback={<EditorPending />}>
			<EditorClient />
		</React.Suspense>
	);
}

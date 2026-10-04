import {
	Badge,
	Center,
	Loader,
	Text,
	useComputedColorScheme,
} from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { renderDiagram } from "@/lib/utils/diagram/render";
import styles from "./styles.module.scss";

function messageOf(error: unknown): string {
	return error instanceof Error
		? error.message
		: "Could not render this diagram";
}

function DiagramSvg({ svg }: { svg: string }) {
	const host = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const node = host.current;
		if (!node) return;
		const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
		const root = doc.documentElement;
		node.replaceChildren();
		if (root.nodeName.toLowerCase() !== "svg") return;
		node.appendChild(document.importNode(root, true));
	}, [svg]);
	return <div ref={host} />;
}

export default function ViewerDiagram({ source }: { source: string }) {
	const colorScheme = useComputedColorScheme("light", {
		getInitialValueInEffect: true,
	});
	const dark = colorScheme === "dark";
	const [svg, setSvg] = useState<string | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		const controller = new AbortController();
		let cancelled = false;
		setError("");
		setSvg(null);
		renderDiagram(source, dark, controller.signal)
			.then((next) => {
				if (!cancelled) setSvg(next);
			})
			.catch((renderError: unknown) => {
				if (!cancelled) setError(messageOf(renderError));
			});
		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [dark, source]);

	let body = (
		<Center h="100%" role="status" aria-label="Loading…">
			<Loader size="lg" type="dots" color="gray" />
		</Center>
	);
	if (error) {
		body = (
			<Text c="red" size="sm" maw={640} role="alert">
				{error}
			</Text>
		);
	} else if (svg) {
		body = <DiagramSvg svg={svg} />;
	}

	return (
		<div className={styles.layout}>
			<div className={styles.bar}>
				<Badge size="xs" variant="light" color="gray">
					Mermaid
				</Badge>
			</div>
			<div className={styles.canvas}>{body}</div>
		</div>
	);
}

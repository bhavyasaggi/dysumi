function messageOf(error: unknown, fallback: string): string {
	if (typeof error === "string" && error.trim()) return error;
	if (error instanceof Error && error.message) return error.message;
	return fallback;
}

function throwIfAborted(signal?: AbortSignal) {
	if (signal?.aborted) {
		throw new DOMException("Diagram render was cancelled", "AbortError");
	}
}

function sanitizeSvg(svg: string): string {
	const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
	if (doc.querySelector("parsererror")) {
		throw new Error("Diagram did not produce an image");
	}
	const root = doc.documentElement;
	if (root.nodeName.toLowerCase() !== "svg") {
		throw new Error("Diagram did not produce an image");
	}
	for (const script of root.querySelectorAll("script")) script.remove();
	for (const element of [root, ...root.querySelectorAll("*")]) {
		for (const attr of [...element.attributes]) {
			const name = attr.name.toLowerCase();
			const value = attr.value.trim().toLowerCase();
			if (name.startsWith("on") || value.startsWith("javascript:")) {
				element.removeAttribute(attr.name);
			}
		}
	}
	return new XMLSerializer().serializeToString(root);
}

let mermaidId = 0;

export async function renderDiagram(
	source: string,
	dark: boolean,
	signal?: AbortSignal,
): Promise<string> {
	throwIfAborted(signal);
	const mermaid = (await import("mermaid")).default;
	throwIfAborted(signal);
	mermaid.initialize({
		startOnLoad: false,
		securityLevel: "strict",
		suppressErrorRendering: true,
		theme: dark ? "dark" : "default",
	});
	mermaidId += 1;
	const host = document.createElement("div");
	host.style.position = "absolute";
	host.style.left = "-10000px";
	host.style.top = "0";
	document.body.appendChild(host);
	try {
		const rendered = await mermaid.render(
			`dysumi-mermaid-${mermaidId}`,
			source,
			host,
		);
		throwIfAborted(signal);
		return sanitizeSvg(rendered.svg);
	} catch (error) {
		throw new Error(messageOf(error, "Could not render this diagram"));
	} finally {
		host.remove();
	}
}

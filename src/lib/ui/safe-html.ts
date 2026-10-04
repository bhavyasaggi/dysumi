import DOMPurify from "dompurify";

const BLOCKED = [
	"base",
	"embed",
	"form",
	"frame",
	"frameset",
	"iframe",
	"object",
	"script",
];

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
	if (!(node instanceof HTMLAnchorElement) || node.target !== "_blank") return;
	const rel = new Set(node.rel.split(/\s+/).filter(Boolean));
	rel.add("noopener");
	rel.add("noreferrer");
	node.rel = [...rel].join(" ");
});

function sourceHtml(html: string, allowStylesheets: boolean): string {
	const parsed = new DOMParser().parseFromString(html, "text/html");
	const headNodes = [
		...parsed.head.querySelectorAll("style"),
		...(allowStylesheets
			? parsed.head.querySelectorAll('link[rel="stylesheet"]')
			: []),
	];
	return `${headNodes.map((node) => node.outerHTML).join("")}${parsed.body.innerHTML}`;
}

export function mountSafeHtml(
	host: HTMLElement,
	html: string,
	options?: { allowStylesheets?: boolean },
) {
	const allowStylesheets = options?.allowStylesheets !== false;
	const clean = DOMPurify.sanitize(sourceHtml(html, allowStylesheets), {
		ADD_ATTR: ["rel", "target"],
		ADD_TAGS: allowStylesheets ? ["link", "style"] : ["style"],
		FORBID_TAGS: allowStylesheets ? BLOCKED : [...BLOCKED, "link"],
		RETURN_DOM_FRAGMENT: true,
	});
	host.replaceChildren(clean);
}

import type { MetaDescriptor } from "react-router";

export const SITE_NAME = "dysumi";

export const SITE_DESCRIPTION =
	"dysumi is a local-first app for opening, viewing, and editing files in the browser. Files stay on your device.";

export function siteOrigin(): string {
	const value = import.meta.env.VITE_SITE_URL;
	if (typeof value !== "string") return "";
	return value.trim().replace(/\/$/, "");
}

export function absoluteUrl(path: string): string | undefined {
	const origin = siteOrigin();
	if (!origin) return undefined;
	return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMeta(page: {
	title: string;
	description: string;
	path: string;
	robots?: string;
	includeCanonical?: boolean;
}): MetaDescriptor[] {
	const url =
		page.includeCanonical === false ? undefined : absoluteUrl(page.path);
	const image = absoluteUrl("/android-chrome-512x512.png");
	const tags: MetaDescriptor[] = [
		{ title: page.title },
		{ name: "description", content: page.description },
		{ property: "og:title", content: page.title },
		{ property: "og:description", content: page.description },
		{ property: "og:type", content: "website" },
		{ property: "og:site_name", content: SITE_NAME },
		{ name: "twitter:card", content: "summary" },
		{ name: "twitter:title", content: page.title },
		{ name: "twitter:description", content: page.description },
	];
	if (page.robots) {
		tags.push({ name: "robots", content: page.robots });
	}
	if (image) {
		tags.push(
			{ property: "og:image", content: image },
			{ name: "twitter:image", content: image },
		);
	}
	if (url) {
		tags.push(
			{ tagName: "link", rel: "canonical", href: url },
			{ property: "og:url", content: url },
		);
	}
	return tags;
}

export function softwareApplicationSchema(): MetaDescriptor {
	const url = absoluteUrl("/");
	const image = absoluteUrl("/android-chrome-512x512.png");
	return {
		"script:ld+json": {
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			name: SITE_NAME,
			applicationCategory: "UtilitiesApplication",
			operatingSystem: "Web",
			description: SITE_DESCRIPTION,
			offers: {
				"@type": "Offer",
				price: "0",
				priceCurrency: "USD",
			},
			license: "https://www.gnu.org/licenses/agpl-3.0.html",
			...(url ? { url } : {}),
			...(image ? { image } : {}),
		},
	};
}

// Production only. Vite's dev server needs eval and inline scripts for refresh.
// scripts/csp-hashes.mjs appends a sha256 hash for each inline script after build.
export const CONTENT_SECURITY_POLICY = [
	"default-src 'self'",
	"base-uri 'self'",
	"object-src 'none'",
	"script-src 'self' 'wasm-unsafe-eval' blob:",
	"style-src 'self' 'unsafe-inline' blob:",
	"img-src 'self' data: blob: https:",
	"font-src 'self' data:",
	"connect-src 'self' data: blob: https: wss:",
	"media-src 'self' blob: data:",
	"worker-src 'self' blob:",
	"frame-src 'self' blob:",
	"form-action 'self'",
].join("; ");

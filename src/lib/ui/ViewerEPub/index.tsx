// EPub viewer using react-reader (prebuilt UI wrapping epub.js)
// Themed via Mantine CSS variables — adapts to light/dark automatically.

import type Rendition from "epubjs/types/rendition";
import { useCallback, useState } from "react";
import {
	EpubViewStyle,
	type IEpubViewStyle,
	type IReactReaderStyle,
	ReactReader,
	ReactReaderStyle,
} from "react-reader";

interface ViewerEPubProps {
	/** Blob URL for the epub file */
	src: string;
}

/** Resolve a CSS variable from :root to its computed value. */
function resolveVar(name: string): string {
	if (typeof document === "undefined") return "";
	return getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
}

// ---------------------------------------------------------------------------
// Reader chrome styles (host DOM — CSS variables work directly)
// ---------------------------------------------------------------------------

const readerStyles: IReactReaderStyle = {
	...ReactReaderStyle,
	container: {
		...ReactReaderStyle.container,
	},
	readerArea: {
		...ReactReaderStyle.readerArea,
		backgroundColor: "var(--mantine-color-body)",
		transition: "all .3s ease",
	},
	containerExpanded: {
		...ReactReaderStyle.containerExpanded,
	},
	titleArea: {
		...ReactReaderStyle.titleArea,
		color: "var(--mantine-color-dimmed)",
	},
	reader: {
		...ReactReaderStyle.reader,
	},
	swipeWrapper: {
		...ReactReaderStyle.swipeWrapper,
	},
	prev: {
		...ReactReaderStyle.prev,
	},
	next: {
		...ReactReaderStyle.next,
	},
	arrow: {
		...ReactReaderStyle.arrow,
		color: "var(--mantine-color-dimmed)",
	},
	arrowHover: {
		...ReactReaderStyle.arrowHover,
		color: "var(--mantine-color-text)",
	},
	tocBackground: {
		...ReactReaderStyle.tocBackground,
	},
	toc: {
		...ReactReaderStyle.toc,
	},
	tocArea: {
		...ReactReaderStyle.tocArea,
		background: "var(--mantine-color-default)",
	},
	tocAreaButton: {
		...ReactReaderStyle.tocAreaButton,
		color: "var(--mantine-color-text)",
		borderBottom: "1px solid var(--mantine-color-default-border)",
	},
	tocButton: {
		...ReactReaderStyle.tocButton,
	},
	tocButtonExpanded: {
		...ReactReaderStyle.tocButtonExpanded,
		background: "var(--mantine-color-default)",
	},
	tocButtonBar: {
		...ReactReaderStyle.tocButtonBar,
		background: "var(--mantine-color-dimmed)",
	},
	tocButtonBarTop: {
		...ReactReaderStyle.tocButtonBarTop,
	},
	tocButtonBottom: {
		...ReactReaderStyle.tocButtonBottom,
	},
	loadingView: {
		...ReactReaderStyle.loadingView,
		color: "var(--mantine-color-dimmed)",
	},
	errorView: {
		...ReactReaderStyle.errorView,
		color: "var(--mantine-color-error)",
	},
};

// ---------------------------------------------------------------------------
// Inner epub view styles (the iframe container)
// ---------------------------------------------------------------------------

const epubViewStyles: IEpubViewStyle = {
	...EpubViewStyle,
	viewHolder: {
		...EpubViewStyle.viewHolder,
	},
	view: {
		...EpubViewStyle.view,
		background: "var(--mantine-color-body)",
	},
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ViewerEPub({ src }: ViewerEPubProps) {
	const [location, setLocation] = useState<string | number>(0);

	// Inject content styles into the epub iframe.
	// The iframe can't inherit Mantine CSS variables, so we resolve them
	// to computed values at call time.
	//
	// - themes.override() applies element.style with !important on the body,
	//   beating any epub-embedded stylesheets.
	// - themes.default() injects a <style> tag for selectors beyond body
	//   (links, headings, tables, images, etc.).
	const onGetRendition = useCallback((rendition: Rendition) => {
		const text = resolveVar("--mantine-color-text");
		const bg = resolveVar("--mantine-color-body");
		const anchor = resolveVar("--mantine-color-anchor");
		const dimmed = resolveVar("--mantine-color-dimmed");
		const border = resolveVar("--mantine-color-default-border");

		// Body-level overrides (highest specificity)
		rendition.themes.override("color", text, true);
		rendition.themes.override("background", bg, true);
		rendition.themes.override("background-color", bg, true);

		// Element-level theme rules
		rendition.themes.default({
			// Headings
			"h1, h2, h3, h4, h5, h6": {
				color: `${text} !important`,
			},
			// Paragraphs and spans
			"p, span, li, dt, dd, figcaption, blockquote, cite": {
				color: `${text} !important`,
			},
			// Links
			"a, a:link, a:visited": {
				color: `${anchor} !important`,
			},
			"a:hover, a:active": {
				color: `${anchor} !important`,
				opacity: "0.8",
			},
			// Code blocks
			"pre, code, kbd, samp": {
				color: `${text} !important`,
				"background-color": `${border} !important`,
			},
			// Tables
			"table, th, td": {
				color: `${text} !important`,
				"border-color": `${border} !important`,
			},
			th: {
				"background-color": `${border} !important`,
			},
			// Horizontal rules
			hr: {
				"border-color": `${border} !important`,
			},
			// Images and SVGs
			"img, svg, video": {
				"max-width": "100% !important",
				height: "auto !important",
			},
			// Captions and small text
			"small, sub, sup, caption": {
				color: `${dimmed} !important`,
			},
			// Definition lists
			dfn: {
				color: `${text} !important`,
			},
			// Divs and sections that may carry background
			"div, section, article, aside, header, footer, nav, main": {
				color: `${text} !important`,
				"background-color": "transparent !important",
			},
		});
	}, []);

	return (
		<div style={{ width: "100%", height: "100%" }}>
			<ReactReader
				url={src}
				location={location}
				locationChanged={(loc: string) => setLocation(loc)}
				showToc
				readerStyles={readerStyles}
				epubViewStyles={epubViewStyles}
				getRendition={onGetRendition}
				epubInitOptions={{ openAs: "epub" }}
			/>
		</div>
	);
}

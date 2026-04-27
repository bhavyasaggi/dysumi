// Easter Egg: BMP files open in jspaint via iframe (https://jspaint.app)

import { useMemo, useRef } from "react";

interface ViewerPaintProps {
	/** Data URL for the BMP file */
	src?: string;
	/** File name */
	fileName?: string;
}

export default function ViewerPaint({ src, fileName }: ViewerPaintProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const jspaintUrl = useMemo(
		() =>
			src
				? `https://jspaint.app/#load:${encodeURIComponent(src)}`
				: "https://jspaint.app",
		[src],
	);

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				position: "relative",
				background: "#008080",
			}}
		>
			<iframe
				ref={iframeRef}
				src={jspaintUrl}
				style={{ width: "100%", height: "100%", border: "none" }}
				title={fileName ?? "Paint"}
				sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads"
			/>
		</div>
	);
}

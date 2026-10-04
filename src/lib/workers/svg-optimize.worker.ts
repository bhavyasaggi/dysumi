import { optimizeSvg } from "@/lib/ui/EditorSvg/optimize";
import type { SvgOptimizeSettings } from "@/lib/ui/EditorSvg/plugins";

export type SvgOptimizeRequest = {
	id: number;
	svg: string;
	settings: SvgOptimizeSettings;
};

export type SvgOptimizeResponse = {
	id: number;
	data?: string;
	error?: string;
};

self.onmessage = (event: MessageEvent<SvgOptimizeRequest>) => {
	const { id, svg, settings } = event.data;
	try {
		const data = optimizeSvg(svg, settings);
		const response: SvgOptimizeResponse = { id, data };
		self.postMessage(response);
	} catch (error) {
		const response: SvgOptimizeResponse = {
			id,
			error: error instanceof Error ? error.message : "Could not optimize SVG",
		};
		self.postMessage(response);
	}
};

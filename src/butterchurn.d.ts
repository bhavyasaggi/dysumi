declare module "butterchurn" {
	interface ButterchurnVisualizer {
		connectAudio(node: AudioNode): void;
		disconnectAudio(node: AudioNode): void;
		loadPreset(preset: object, blendTime?: number): void;
		render(options?: {
			audioLevels?: {
				timeByteArray: Uint8Array;
				timeByteArrayL: Uint8Array;
				timeByteArrayR: Uint8Array;
			};
			elapsedTime?: number;
		}): void;
		setRendererSize(width: number, height: number): void;
		launchSongTitleAnim(text: string): void;
	}
	interface ButterchurnStatic {
		createVisualizer(
			context: AudioContext,
			canvas: HTMLCanvasElement,
			options: { width: number; height: number; pixelRatio?: number },
		): ButterchurnVisualizer;
	}
	const butterchurn: ButterchurnStatic;
	export default butterchurn;
}

declare module "butterchurn-presets" {
	const presets: {
		getPresets: () => Record<string, object>;
	};
	export default presets;
}

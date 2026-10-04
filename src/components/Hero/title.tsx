import React, { useEffect, useRef } from "react";

const INTENSITY = 0.18;

export interface HeroTitleProps {
	children: React.ReactNode;
	fontSize?: number | string;
	fontWeight?: string | number;
	fontFamily?: string;
	color?: string;
	className?: string;
	style?: React.CSSProperties;
	paused?: boolean;
}

export default function HeroTitle({
	children,
	fontSize = "clamp(2rem, 8vw, 8rem)",
	fontWeight = 900,
	fontFamily = "inherit",
	color = "#fff",
	className,
	style,
	paused = false,
}: HeroTitleProps) {
	const canvasRef = useRef<
		HTMLCanvasElement & { cleanupFuzzyText?: () => void }
	>(null);

	useEffect(() => {
		let animationFrameId: number;
		let isCancelled = false;
		const canvas = canvasRef.current;
		if (!canvas) return;

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: canvas drawing logic with many conditional branches
		const init = async () => {
			if (document.fonts?.ready) {
				await document.fonts.ready;
			}
			if (isCancelled) return;

			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			const computedFontFamily =
				fontFamily === "inherit"
					? window.getComputedStyle(canvas).fontFamily || "sans-serif"
					: fontFamily;

			const fontSizeStr =
				typeof fontSize === "number" ? `${fontSize}px` : fontSize;
			let numericFontSize: number;
			if (typeof fontSize === "number") {
				numericFontSize = fontSize;
			} else {
				const temp = document.createElement("span");
				temp.style.fontSize = fontSize;
				document.body.appendChild(temp);
				const computedSize = window.getComputedStyle(temp).fontSize;
				numericFontSize = Number.parseFloat(computedSize);
				document.body.removeChild(temp);
			}

			const text = React.Children.toArray(children).join("");

			const offscreen = document.createElement("canvas");
			const offCtx = offscreen.getContext("2d");
			if (!offCtx) return;

			offCtx.font = `${fontWeight} ${fontSizeStr} ${computedFontFamily}`;
			offCtx.textBaseline = "alphabetic";
			const metrics = offCtx.measureText(text);

			const actualLeft = metrics.actualBoundingBoxLeft ?? 0;
			const actualRight = metrics.actualBoundingBoxRight ?? metrics.width;
			const actualAscent = metrics.actualBoundingBoxAscent ?? numericFontSize;
			const actualDescent =
				metrics.actualBoundingBoxDescent ?? numericFontSize * 0.2;

			const textBoundingWidth = Math.ceil(actualLeft + actualRight);
			const tightHeight = Math.ceil(actualAscent + actualDescent);

			const extraWidthBuffer = 10;
			const offscreenWidth = textBoundingWidth + extraWidthBuffer;

			offscreen.width = offscreenWidth;
			offscreen.height = tightHeight;

			const xOffset = extraWidthBuffer / 2;
			offCtx.font = `${fontWeight} ${fontSizeStr} ${computedFontFamily}`;
			offCtx.textBaseline = "alphabetic";
			offCtx.fillStyle = color;
			offCtx.fillText(text, xOffset - actualLeft, actualAscent);

			const horizontalMargin = 50;
			const verticalMargin = 0;
			canvas.width = offscreenWidth + horizontalMargin * 2;
			canvas.height = tightHeight + verticalMargin * 2;
			ctx.translate(horizontalMargin, verticalMargin);

			const fuzzRange = 30;
			const reduceMotion = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;
			const still = reduceMotion || paused;

			const draw = (animate: boolean) => {
				ctx.clearRect(
					-fuzzRange,
					-fuzzRange,
					offscreenWidth + 2 * fuzzRange,
					tightHeight + 2 * fuzzRange,
				);
				for (let j = 0; j < tightHeight; j++) {
					const dx = animate
						? Math.floor(INTENSITY * (Math.random() - 0.5) * fuzzRange)
						: 0;
					ctx.drawImage(
						offscreen,
						0,
						j,
						offscreenWidth,
						1,
						dx,
						j,
						offscreenWidth,
						1,
					);
				}
			};

			if (still) {
				draw(false);
				return;
			}

			const run = () => {
				if (isCancelled || document.hidden) return;
				draw(true);
				animationFrameId = window.requestAnimationFrame(run);
			};
			const onVisibility = () => {
				window.cancelAnimationFrame(animationFrameId);
				if (!document.hidden) run();
			};
			document.addEventListener("visibilitychange", onVisibility);
			run();

			canvas.cleanupFuzzyText = () => {
				document.removeEventListener("visibilitychange", onVisibility);
				window.cancelAnimationFrame(animationFrameId);
			};
		};

		init();

		return () => {
			isCancelled = true;
			window.cancelAnimationFrame(animationFrameId);
			canvas?.cleanupFuzzyText?.();
		};
	}, [children, fontSize, fontWeight, fontFamily, color, paused]);

	return <canvas ref={canvasRef} className={className} style={style} inert />;
}

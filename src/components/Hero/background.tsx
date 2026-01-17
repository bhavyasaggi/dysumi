import { useEffect, useRef } from "react";

interface GridOffset {
	x: number;
	y: number;
}

const DEFAULT_SPEED = 1;
const DEFAULT_BORDER_COLOR = "#999";
const DEFAULT_SQUARE_SIZE = 40;

export default function HeroBackground(props: {
	className?: string;
	style?: React.CSSProperties;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const requestRef = useRef<number | null>(null);
	const numSquaresX = useRef<number>(0);
	const numSquaresY = useRef<number>(0);
	const gridOffset = useRef<GridOffset>({ x: 0, y: 0 });

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");

		const resizeCanvas = () => {
			canvas.width = canvas.offsetWidth;
			canvas.height = canvas.offsetHeight;
			numSquaresX.current = Math.ceil(canvas.width / DEFAULT_SQUARE_SIZE) + 1;
			numSquaresY.current = Math.ceil(canvas.height / DEFAULT_SQUARE_SIZE) + 1;
		};

		window.addEventListener("resize", resizeCanvas);
		resizeCanvas();

		const drawGrid = () => {
			if (!ctx) return;
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			const startX =
				Math.floor(gridOffset.current.x / DEFAULT_SQUARE_SIZE) *
				DEFAULT_SQUARE_SIZE;
			const startY =
				Math.floor(gridOffset.current.y / DEFAULT_SQUARE_SIZE) *
				DEFAULT_SQUARE_SIZE;

			for (
				let x = startX;
				x < canvas.width + DEFAULT_SQUARE_SIZE;
				x += DEFAULT_SQUARE_SIZE
			) {
				for (
					let y = startY;
					y < canvas.height + DEFAULT_SQUARE_SIZE;
					y += DEFAULT_SQUARE_SIZE
				) {
					const squareX = x - (gridOffset.current.x % DEFAULT_SQUARE_SIZE);
					const squareY = y - (gridOffset.current.y % DEFAULT_SQUARE_SIZE);

					ctx.strokeStyle = DEFAULT_BORDER_COLOR;
					ctx.strokeRect(
						squareX,
						squareY,
						DEFAULT_SQUARE_SIZE,
						DEFAULT_SQUARE_SIZE,
					);
				}
			}

			const gradient = ctx.createRadialGradient(
				canvas.width / 2,
				canvas.height / 2,
				0,
				canvas.width / 2,
				canvas.height / 2,
				Math.sqrt(canvas.width ** 2 + canvas.height ** 2) / 2,
			);
			gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
			gradient.addColorStop(1, "#060010");

			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		};

		const updateAnimation = () => {
			const effectiveSpeed = Math.max(DEFAULT_SPEED, 0.1);

			gridOffset.current.x =
				(gridOffset.current.x - effectiveSpeed + DEFAULT_SQUARE_SIZE) %
				DEFAULT_SQUARE_SIZE;
			gridOffset.current.y =
				(gridOffset.current.y - effectiveSpeed + DEFAULT_SQUARE_SIZE) %
				DEFAULT_SQUARE_SIZE;

			drawGrid();
			requestRef.current = requestAnimationFrame(updateAnimation);
		};

		requestRef.current = requestAnimationFrame(updateAnimation);
		return () => {
			window.removeEventListener("resize", resizeCanvas);
			if (requestRef.current) cancelAnimationFrame(requestRef.current);
		};
	}, []);

	return (
		<canvas ref={canvasRef} className={props.className} style={props.style} />
	);
}

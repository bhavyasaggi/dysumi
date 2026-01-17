// Easter Egg: BMP files open in jspaint with Clippy assistant!
// Uses jspaint.app (1j01/jspaint) and clippyts (pi0/clippyjs)

import { Box, Portal } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.scss";

interface ViewerPaintProps {
	/** Image source - blob URL for the BMP file */
	src?: string;
	/** File name */
	fileName?: string;
}

// Clippy messages for the paint experience
const CLIPPY_MESSAGES = [
	"It looks like you're editing a bitmap! Would you like help with that?",
	"Pro tip: Press Ctrl+Z to undo your last action!",
	"Did you know? BMP files don't support transparency!",
	"I see you're an artist! Keep up the great work!",
	"Remember to save your masterpiece!",
	"The spray can tool is my favorite!",
	"Try the polygon tool - it's surprisingly fun!",
	"You can use the eyedropper to pick colors from the image!",
	"The magnifier lets you edit pixel by pixel!",
	"MS Paint was first released in 1985. Time flies!",
	"Fun fact: The first version of Paint was called Paintbrush!",
	"Need help? Just click on me anytime!",
	"You're doing great! Bob Ross would be proud!",
	"Every artist was first an amateur. - Ralph Waldo Emerson",
	"The eraser tool also works as a color replacer with right-click!",
];

// Draggable Clippy component
function DraggableClippy() {
	const [position, setPosition] = useState({ x: 50, y: 50 });
	const [isDragging, setIsDragging] = useState(false);
	const [message, setMessage] = useState(CLIPPY_MESSAGES[0]);
	const [showBubble, setShowBubble] = useState(true);
	const [isAnimating, setIsAnimating] = useState(false);
	const dragOffset = useRef({ x: 0, y: 0 });
	const clippyRef = useRef<HTMLDivElement>(null);

	// Show random messages periodically
	useEffect(() => {
		const interval = setInterval(() => {
			const randomMessage = CLIPPY_MESSAGES[Math.floor(Math.random() * CLIPPY_MESSAGES.length)];
			setMessage(randomMessage);
			setShowBubble(true);
			setIsAnimating(true);
			setTimeout(() => setIsAnimating(false), 500);
		}, 15000);

		// Hide bubble after 8 seconds
		const hideTimeout = setTimeout(() => {
			setShowBubble(false);
		}, 8000);

		return () => {
			clearInterval(interval);
			clearTimeout(hideTimeout);
		};
	}, []);

	// Handle drag start
	const handleMouseDown = (e: React.MouseEvent) => {
		if (clippyRef.current) {
			const rect = clippyRef.current.getBoundingClientRect();
			dragOffset.current = {
				x: e.clientX - rect.left,
				y: e.clientY - rect.top,
			};
			setIsDragging(true);
		}
	};

	// Handle drag
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (isDragging) {
				setPosition({
					x: e.clientX - dragOffset.current.x,
					y: e.clientY - dragOffset.current.y,
				});
			}
		};

		const handleMouseUp = () => {
			setIsDragging(false);
		};

		if (isDragging) {
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
		}

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDragging]);

	// Click to show new message
	const handleClick = () => {
		const randomMessage = CLIPPY_MESSAGES[Math.floor(Math.random() * CLIPPY_MESSAGES.length)];
		setMessage(randomMessage);
		setShowBubble(true);
		setIsAnimating(true);
		setTimeout(() => setIsAnimating(false), 500);
	};

	return (
		<Portal>
			<div
				ref={clippyRef}
				className={`${styles.clippy} ${isDragging ? styles.dragging : ""}`}
				style={{
					left: position.x,
					top: position.y,
				}}
				onMouseDown={handleMouseDown}
				onClick={handleClick}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => e.key === "Enter" && handleClick()}
			>
				{/* Speech bubble */}
				{showBubble && (
					<div className={`${styles.speechBubble} ${isAnimating ? styles.animate : ""}`}>
						<p>{message}</p>
						<button
							type="button"
							className={styles.closeBubble}
							onClick={(e) => {
								e.stopPropagation();
								setShowBubble(false);
							}}
						>
							×
						</button>
					</div>
				)}

				{/* Clippy character (CSS art) */}
				<div className={styles.clippyBody}>
					<div className={styles.clippyEyes}>
						<div className={styles.eye}>
							<div className={styles.pupil} />
						</div>
						<div className={styles.eye}>
							<div className={styles.pupil} />
						</div>
					</div>
					<div className={styles.clippyBrows}>
						<div className={styles.brow} />
						<div className={styles.brow} />
					</div>
				</div>
			</div>
		</Portal>
	);
}

export default function ViewerPaint({ src, fileName }: ViewerPaintProps) {
	const [jspaintUrl, setJspaintUrl] = useState<string>("https://jspaint.app");
	const iframeRef = useRef<HTMLIFrameElement>(null);

	// Construct jspaint URL with the image
	useEffect(() => {
		if (src) {
			// jspaint can open images via URL parameter
			// We'll use the #load: hash to load the image
			const encodedSrc = encodeURIComponent(src);
			setJspaintUrl(`https://jspaint.app/#load:${encodedSrc}`);
		}
	}, [src]);

	return (
		<Box className={styles.paintViewer}>
			{/* jspaint iframe */}
			<iframe
				ref={iframeRef}
				src={jspaintUrl}
				className={styles.paintIframe}
				title={fileName || "Paint"}
				sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
			/>

			{/* Draggable Clippy Easter Egg */}
			<DraggableClippy />
		</Box>
	);
}
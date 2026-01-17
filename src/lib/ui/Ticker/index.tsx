import { Box, type BoxProps } from "@mantine/core";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.scss";

export default function Ticker({
	separator = "\u00A0",
	children,
	...restBoxProps
}: BoxProps & { separator?: string; children?: string }) {
	const [repeatCount, setRepeatCount] = useState(() => {
		const estimatedItemWidth = Math.max(1, (children?.length || 0) * 12 + 48);
		return Math.ceil(600 / estimatedItemWidth) + 2;
	});

	const trackRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const calculateRepetitions = () => {
			if (!trackRef.current || !measureRef.current) return;

			const containerWidth =
				trackRef.current.parentElement?.offsetWidth || window.innerWidth;
			const itemWidth = measureRef.current.offsetWidth;

			if (itemWidth > 0) {
				setRepeatCount(Math.ceil(containerWidth / itemWidth) + 2);
			}
		};

		calculateRepetitions();

		const observer = new ResizeObserver(calculateRepetitions);
		if (trackRef.current?.parentElement) {
			observer.observe(trackRef.current.parentElement);
		}

		return () => observer.disconnect();
	}, []);

	const offsetPercentage = 100 / repeatCount;
	// Construct the single long string
	const fullText =
		Array(repeatCount).fill(children).join(separator) + separator;

	return (
		<Box
			{...restBoxProps}
			className={clsx(styles.root, restBoxProps.className)}
		>
			<span className={styles.tape}>{children}</span>
			<div
				className={styles.track}
				ref={trackRef}
				aria-hidden="true"
				style={
					{
						"--ticker-offset": `-${offsetPercentage}%`,
					} as React.CSSProperties
				}
			>
				<span
					ref={measureRef}
					style={{
						visibility: "hidden",
						position: "absolute",
						whiteSpace: "nowrap",
					}}
					aria-hidden="true"
				>
					{children}
					{separator}
				</span>
				{fullText}
			</div>
		</Box>
	);
}

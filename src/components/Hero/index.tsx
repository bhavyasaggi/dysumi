import { Box, type BoxProps, Button } from "@mantine/core";
import type React from "react";
import { useCallback, useState } from "react";
import HeroBackground from "./background";
import styles from "./styles.module.scss";
import HeroTitle from "./title";

export default function Hero({
	title,
	children,
	...restBoxProps
}: BoxProps & { title?: string; children?: React.ReactNode }) {
	const [paused, setPaused] = useState(false);
	const togglePaused = useCallback(() => {
		setPaused((current) => !current);
	}, []);
	return (
		<Box pos="relative" mih="400px" py="xl" px="md" {...restBoxProps}>
			<HeroBackground
				paused={paused}
				style={{
					position: "absolute",
					inset: 0,
					width: "100%",
					height: "100%",
				}}
			/>
			<Box
				pos="absolute"
				ta="center"
				top="50%"
				left="50%"
				style={{
					transform: "translate(-50%, -50%)",
				}}
			>
				{title ? <h1 className={styles.visuallyHidden}>{title}</h1> : null}
				<HeroTitle paused={paused} style={{ display: "block" }}>
					{title}
				</HeroTitle>
				{children}
				<Button
					variant="subtle"
					color="gray"
					size="compact-sm"
					mt="md"
					onClick={togglePaused}
					aria-pressed={paused}
					style={{ color: "#f8f9fa" }}
				>
					{paused ? "Play animation" : "Pause animation"}
				</Button>
			</Box>
		</Box>
	);
}

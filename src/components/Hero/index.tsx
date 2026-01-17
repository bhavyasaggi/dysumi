import { Box, type BoxProps } from "@mantine/core";
import type React from "react";
import HeroBackground from "./background";
import HeroTitle from "./title";

export default function Hero({
	title,
	children,
	...restBoxProps
}: BoxProps & { title?: string; children?: React.ReactNode }) {
	return (
		<Box pos="relative" mih="400px" py="xl" px="md" {...restBoxProps}>
			<HeroBackground
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
				<HeroTitle style={{ display: "block" }}>{title}</HeroTitle>
				{children}
			</Box>
		</Box>
	);
}

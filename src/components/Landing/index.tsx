import {
	Box,
	type BoxProps,
	Text,
	type TextProps,
	Title,
	type TitleProps,
} from "@mantine/core";
import clsx from "clsx";
import LandingBackground from "./background";
import styles from "./styles.module.scss";

function LandingTitle({
	speed = 1,
	children,
	className,
	style,
	...props
}: TitleProps & { speed?: number; children?: string }) {
	return (
		<Title
			data-text={children}
			{...props}
			className={clsx(styles.glitch, className)}
			style={{
				"--after-duration": `${speed * 3}s`,
				"--before-duration": `${speed * 2}s`,
				...style,
			}}
		>
			{children}
		</Title>
	);
}

function LandingText(props: TextProps & { children?: React.ReactNode }) {
	return (
		<Text {...props} className={styles.glitchText}>
			{props.children}
		</Text>
	);
}

function LandingItem(props: BoxProps & { children?: React.ReactNode }) {
	return (
		<Box {...props} className={clsx(styles.glitchText, props.className)}>
			{props.children}
		</Box>
	);
}

function Landing(props: BoxProps & { children?: React.ReactNode }) {
	return (
		<Box pos="relative" {...props}>
			{props.children}
		</Box>
	);
}

Landing.Background = LandingBackground;
Landing.Title = LandingTitle;
Landing.Text = LandingText;
Landing.Item = LandingItem;

export default Landing;

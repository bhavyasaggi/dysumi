import { Button, Center, Stack, Text } from "@mantine/core";
import React from "react";

interface ScreenBoundaryProps {
	children: React.ReactNode;
}

interface ScreenBoundaryState {
	error: Error | null;
}

// React still requires a class for componentDidCatch / getDerivedStateFromError.
// biome-ignore lint/style/useReactFunctionComponents: error boundaries cannot be function components
export class ScreenBoundary extends React.Component<
	ScreenBoundaryProps,
	ScreenBoundaryState
> {
	override state: ScreenBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): ScreenBoundaryState {
		return { error };
	}

	retry = () => {
		this.setState({ error: null });
	};

	override render() {
		const { error } = this.state;
		if (!error) return this.props.children;
		return (
			<Center py="xl" px="sm" h="100%">
				<Stack align="center" gap="sm" maw={520}>
					<Text c="red" ta="center" role="alert">
						{error.message || "This view failed. Try again."}
					</Text>
					<Button variant="light" onClick={this.retry}>
						Try again
					</Button>
				</Stack>
			</Center>
		);
	}
}

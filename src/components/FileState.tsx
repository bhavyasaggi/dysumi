import { Button, Center, Loader, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

export function FileState({
	processing,
	error,
	empty,
	emptyLabel,
	onRetry,
	children,
}: {
	processing: boolean;
	error: string;
	empty: boolean;
	emptyLabel: string;
	onRetry?: () => void;
	children: ReactNode;
}) {
	if (processing) {
		return (
			<Center py="xl" px="sm" h="100%" role="status" aria-label="Loading…">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}
	if (error) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Stack align="center" gap="sm" maw={520}>
					<Text c="red" ta="center" role="alert">
						{error}
					</Text>
					{onRetry ? (
						<Button variant="light" onClick={onRetry}>
							Try again
						</Button>
					) : null}
				</Stack>
			</Center>
		);
	}
	if (empty) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">{emptyLabel}</Text>
			</Center>
		);
	}
	return children;
}

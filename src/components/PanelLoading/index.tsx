import { Center, Loader } from "@mantine/core";

export default function PanelLoading() {
	return (
		<Center py="xl" px="sm">
			<Loader type="dots" size="xl" color="dark" />
		</Center>
	);
}

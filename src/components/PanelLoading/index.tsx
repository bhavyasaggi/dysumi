import { Center, Loader } from "@mantine/core";
import InterfaceShellPanel from "@/components/InterfaceShell/panel";

export default function PanelLoading() {
	return (
		<InterfaceShellPanel title="Loading...">
			<Center py="xl" px="sm">
				<Loader type="dots" size="xl" color="dark" />
			</Center>
		</InterfaceShellPanel>
	);
}

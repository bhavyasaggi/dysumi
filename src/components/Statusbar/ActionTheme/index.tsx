import {
	ActionIcon,
	useComputedColorScheme,
	useMantineColorScheme,
} from "@mantine/core";
import Icon from "@/lib/ui/Icon";

export default function StatusbarActionTheme() {
	const { setColorScheme } = useMantineColorScheme();
	const computedColorScheme = useComputedColorScheme("light", {
		getInitialValueInEffect: true,
	});
	const toggleColorScheme = () => {
		setColorScheme(computedColorScheme === "dark" ? "light" : "dark");
	};
	return (
		<ActionIcon variant="subtle" color="gray" onClick={toggleColorScheme}>
			<Icon
				title={`Toggle theme (${computedColorScheme})`}
				icon={computedColorScheme === "dark" ? "sun" : "moon"}
				height={16}
				width={16}
			/>
		</ActionIcon>
	);
}

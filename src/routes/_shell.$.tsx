import { Button, Text } from "@mantine/core";
import Hero from "@/components/Hero";
import Icon from "@/lib/ui/Icon";
import Link from "@/lib/ui/Link";

export default function RouteError() {
	return (
		<Hero title="Not Found" mih="100dvh" bg="black">
			<Text size="xl" c="gray" py="lg">
				The page you are looking for does not exist.
			</Text>
			<Button
				component={Link}
				to="/"
				size="xl"
				variant="filled"
				color="gray"
				leftSection={
					<Icon icon="arrow-left" height={16} width={16} title="Go Back" />
				}
			>
				Go Back
			</Button>
		</Hero>
	);
}

import { Button, Text } from "@mantine/core";
import Hero from "@/components/Hero";
import { pageMeta } from "@/lib/seo";
import Icon from "@/lib/ui/Icon";
import Link from "@/lib/ui/Link";

// biome-ignore lint/style/useComponentExportOnlyModules: React Router convention
export function meta({ location }: { location: { pathname: string } }) {
	return pageMeta({
		title: "Page not found · dysumi",
		description: "That page does not exist.",
		path: location.pathname,
		robots: "noindex",
		includeCanonical: false,
	});
}

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
				variant="default"
				leftSection={
					<Icon icon="arrow-left" height={16} width={16} title="Go Back" />
				}
			>
				Go Back
			</Button>
		</Hero>
	);
}

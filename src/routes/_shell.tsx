import {
	ActionIcon,
	AppShell,
	Box,
	Button,
	Container,
	Grid,
	Group,
	Text,
} from "@mantine/core";
import { Outlet } from "react-router";
import Icon from "@/lib/ui/Icon";
import Image from "@/lib/ui/Image";
import Link from "@/lib/ui/Link";

export default function RouteShell() {
	return (
		<AppShell>
			<AppShell.Main mih="400px">
				<Outlet />
				<Box>
					<Button
						fullWidth
						size="compact-md"
						variant="light"
						color="gray"
						leftSection={
							<Icon
								icon="chevrons-up"
								height={16}
								width={16}
								title="Scroll to Top"
							/>
						}
						rightSection={
							<Icon
								icon="chevrons-up"
								height={16}
								width={16}
								title="Scroll to Top"
							/>
						}
					>
						Scroll to Top
					</Button>
				</Box>
				<Box py="md" bg="var(--mantine-color-default-hover)">
					<Container size="md">
						<Grid>
							<Grid.Col span={{ xs: 12, md: 8 }}>
								<Group wrap="nowrap" align="center" justify="start" gap="xs">
									<Image
										src="/favicon-32x32.png"
										height={32}
										width={32}
										alt="Logo"
										flex="0 0 32px"
									/>
									<Text span size="xl" c="blue" fw="bold">
										dysumi
									</Text>
								</Group>
								<Text py="sm" size="sm" c="gray">
									© 20XX dysumi. All rights reserved.
									<br />
									This software is licensed under the{" "}
									<Link
										size="sm"
										c="gray"
										href="https://www.gnu.org/licenses/agpl-3.0.en.html"
									>
										GNU Affero General Public License v3.0
									</Link>
								</Text>
								<Group gap={0}>
									<ActionIcon
										variant="subtle"
										color="gray"
										c="gray"
										component={Link}
										href="https://twitter.com/"
									>
										<Icon
											icon="twitter"
											height={16}
											width={16}
											title="Icon twitter"
										/>
									</ActionIcon>
									<ActionIcon
										variant="subtle"
										color="gray"
										c="gray"
										component={Link}
										href="https://github.com/"
									>
										<Icon
											icon="github"
											height={16}
											width={16}
											title="Icon github"
										/>
									</ActionIcon>
								</Group>
							</Grid.Col>
							<Grid.Col span={{ xs: 12, md: 4 }}>
								<Box ta="right">
									<Box mih="32px" mb="sm">
										<Text size="xl" c="gray" fw="bold">
											About
										</Text>
									</Box>
									<Box>
										<Link to="/privacy-policy" c="var(--mantine-color-text)">
											Privacy Policy
										</Link>
									</Box>
								</Box>
							</Grid.Col>
						</Grid>
					</Container>
				</Box>
			</AppShell.Main>
		</AppShell>
	);
}

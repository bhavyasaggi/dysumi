import {
	Box,
	Button,
	Center,
	Container,
	Group,
	Marquee,
	Paper,
	Space,
	Text,
	VisuallyHidden,
} from "@mantine/core";
import clsx from "clsx";
import { useCallback, useState } from "react";

import Landing from "@/components/Landing";
import landingStyles from "@/components/Landing/styles.module.scss";
import {
	pageMeta,
	SITE_DESCRIPTION,
	softwareApplicationSchema,
} from "@/lib/seo";
import Icon from "@/lib/ui/Icon";
import Image from "@/lib/ui/Image";
import Link from "@/lib/ui/Link";

const EXTENSIONS = [
	".txt",
	".md",
	".adoc",
	".asciidoc",
	".tex",
	".rst",
	".fb2",
	".djvu",
	".excalidraw",
	".mermaid",
	".mmd",
	".json",
	".yml",
	".yaml",
	".toml",
	".csv",
	".tsv",
	".ofx", // "pain.001", "pain.002",
	".qif",
	".qfx",
	".ledger",
	".hledger",
	".journal",
	".mbox",
	".eml",
	".ics",
	".vcf",
	".epub",
	".chm",
	".pdf",
	".jpg",
	".jpeg",
	".png",
	".svg",
	".bmp",
	".mp3",
	".mp4",
	".webm",
	".midi",
	".mid",
	".torrent",
	".nfo",
	".bin",
	".dat",
	".ini",
	".log",
	".arb",
	".pot",
	".po",
	".xlf",
	".xliff",
	".xlif",
	".strings",
	".kml",
	".kmz",
	".tcx",
	".geojson",
	".http",
	".rest",
	".graphql",
	".har",
	".curl",
	".jwt",
	".jwk",
	".jwks",
	".jwe",
	".well-known",
];

// biome-ignore lint/style/useComponentExportOnlyModules: React Router convention
export function meta() {
	return [
		...pageMeta({
			title: "dysumi",
			description: SITE_DESCRIPTION,
			path: "/",
		}),
		softwareApplicationSchema(),
	];
}

export default function RouteShellIndex() {
	const [formatsPaused, setFormatsPaused] = useState(false);
	const toggleFormats = useCallback(() => {
		setFormatsPaused((current) => !current);
	}, []);
	return (
		<>
			<Landing bg="black">
				<Landing.Background
					intensity={0.4}
					speed={0.2}
					size={0.4}
					style={{
						height: "300px",
						width: "100%",
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
					}}
				/>
				<Container py="md">
					<Group wrap="nowrap">
						<Landing.Item>
							<Image
								src="/favicon-32x32.png"
								fit="contain"
								height={32}
								width={32}
								alt="Logo"
							/>
						</Landing.Item>
					</Group>
					<Center>
						<Paper
							radius="md"
							p="md"
							shadow="md"
							style={{
								background: "transparent",
								backdropFilter: "blur(6px)",
								zIndex: "var(--mantine-z-index-app)",
							}}
						>
							<Landing.Title
								order={1}
								fz="clamp(2rem, 20dvw, 12rem)"
								translate="no"
							>
								dysumi
							</Landing.Title>
						</Paper>
					</Center>
					<Box ta="center">
						<Landing.Text size="xl" my="xl">
							The <em>web-app</em> for <strong>your</strong> files.
						</Landing.Text>
						<Landing.Item my="xl">
							<Button
								component={Link}
								to="/editor"
								variant="outline"
								size="xl"
								color="white"
								rightSection={
									<Icon
										icon="arrow-right"
										height="24"
										width="24"
										title="Icon Start"
									/>
								}
							>
								Get Started
							</Button>
						</Landing.Item>
					</Box>
				</Container>
			</Landing>

			<Box bg="black" c="white">
				<Container
					component={Space}
					h="420px"
					role="img"
					aria-label="Preview of the dysumi editor"
					style={{
						background: "#000 url('/demo-1.png') right top / cover no-repeat",
					}}
				/>
				<VisuallyHidden>
					Supported formats: {EXTENSIONS.join(" ")}
				</VisuallyHidden>
				<Marquee
					bg="dark"
					py="xl"
					gap="xl"
					fadeEdges={false}
					pauseOnHover
					aria-hidden="true"
					classNames={{
						content: clsx(
							landingStyles.marquee,
							formatsPaused && landingStyles.marqueePaused,
						),
					}}
				>
					{EXTENSIONS.map((ext) => (
						<Text key={ext} fz="h1" fw="bold" c="gray" span>
							{ext}
						</Text>
					))}
				</Marquee>
				<Center py="sm">
					<Button
						variant="subtle"
						color="gray"
						size="compact-sm"
						onClick={toggleFormats}
						aria-pressed={formatsPaused}
						style={{ color: "#f8f9fa" }}
					>
						{formatsPaused ? "Play formats" : "Pause formats"}
					</Button>
				</Center>
			</Box>
		</>
	);
}

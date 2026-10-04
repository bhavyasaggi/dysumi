import {
	ActionIcon,
	AppShell,
	Box,
	Center,
	Divider,
	Loader,
	Splitter,
	Stack,
} from "@mantine/core";
import type { SplitterPaneSize } from "@mantine/hooks";
import type { FeatherIconNames } from "feather-icons";
import React, { useCallback, useState } from "react";

import Icon from "@/lib/ui/Icon";
import Image from "@/lib/ui/Image";
import Link from "@/lib/ui/Link";

import InterfaceShellActivity from "./Activity";
import InterfaceShellPanel from "./Panel";
import InterfaceShellStatus from "./Status";
import styles from "./styles.module.scss";

// Hoisted static config objects — avoids re-creation on every render
const FOOTER_CONFIG = { height: "1.8em" } as const;
const NAVBAR_CONFIG = { width: "46px", breakpoint: "0" } as const;
const NAVBAR_STYLES = { navbar: { alignItems: "center" } } as const;
const ASIDE_BORDER_STYLE = {
	borderRight: "1px solid var(--mantine-color-default-border)",
	backgroundColor: "var(--mantine-color-default-hover)",
} as const;
const OVERFLOW_STYLE = { overflow: "auto" } as const;
const PANE_STYLE = { overflow: "hidden" } as const;
const OPEN_SIZES: SplitterPaneSize[] = [20, 80];
const CLOSED_SIZES: SplitterPaneSize[] = [0, 100];

function paneSize(size: SplitterPaneSize | undefined): number {
	if (typeof size === "number") return size;
	if (!size) return 0;
	const value = Number.parseFloat(size);
	return Number.isFinite(value) ? value : 0;
}

export interface InterfaceShellProps {
	readonly loading?: boolean;
	readonly panel: string | undefined;
	readonly panelData?: Array<{
		id: string;
		icon: FeatherIconNames;
		title: string;
		Component?: React.ComponentType;
	}>;
	readonly onPanel: (panel: string | undefined) => void;
	readonly onSettings?: () => void;
	readonly children?: React.ReactNode;
}

// Controlled
export default function InterfaceShell(props: InterfaceShellProps) {
	const viewLoading = props.loading;
	const viewPanel = props.panel;

	const hasPanels = Boolean(props.panelData && props.panelData.length > 0);
	const [sizes, setSizes] = useState<SplitterPaneSize[]>(
		viewPanel ? OPEN_SIZES : CLOSED_SIZES,
	);
	let sizesOverride = sizes;
	if (!(hasPanels && viewPanel)) {
		sizesOverride = CLOSED_SIZES;
	} else if (paneSize(sizes[0]) <= 0) {
		sizesOverride = OPEN_SIZES;
	}

	const onPanelClick = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			const id = event.currentTarget.dataset.panelId;
			if (!id) return;
			props.onPanel(id === viewPanel ? undefined : id);
		},
		[props.onPanel, viewPanel],
	);

	const onSizeChange = (next: SplitterPaneSize[]) => {
		const aside = paneSize(next[0]);
		setSizes(next);
		if (aside <= 0) {
			if (viewPanel) props.onPanel(undefined);
			return;
		}
		if (!viewPanel) props.onPanel(props.panelData?.[0]?.id);
	};

	const main = (
		<Stack h="calc(100dvh - 1.8em)" gap={0}>
			<Box flex="0 0 auto">
				<InterfaceShellActivity />
				<Divider />
			</Box>
			<Box flex="1 1 auto" style={OVERFLOW_STYLE}>
				{props.children}
			</Box>
		</Stack>
	);

	return (
		<AppShell footer={FOOTER_CONFIG} navbar={NAVBAR_CONFIG}>
			<AppShell.Navbar
				bg="var(--mantine-color-disabled)"
				styles={NAVBAR_STYLES}
			>
				<AppShell.Section grow>
					<ActionIcon.Group orientation="vertical">
						<ActionIcon
							component={Link}
							to="/"
							variant="transparent"
							w="46px"
							aria-label="dysumi home"
						>
							<Image
								src="/favicon-32x32.png"
								fit="contain"
								height={16}
								width={16}
								alt=""
							/>
						</ActionIcon>
						{props.panelData
							?.filter((panelItem) => panelItem.id !== "settings")
							.map((panelItem) => {
								const isActive = panelItem.id === viewPanel;
								return (
									<ActionIcon
										disabled={viewLoading}
										key={panelItem.id}
										variant={isActive && !viewLoading ? "filled" : "subtle"}
										color="gray"
										size="xl"
										data-panel-id={panelItem.id}
										onClick={onPanelClick}
										aria-label={panelItem.title}
										aria-pressed={isActive}
									>
										<Icon
											icon={panelItem.icon as FeatherIconNames}
											title={panelItem.title}
											height={16}
											width={16}
										/>
									</ActionIcon>
								);
							})}
					</ActionIcon.Group>
				</AppShell.Section>
				<AppShell.Section>
					<ActionIcon.Group orientation="vertical">
						{props.onSettings ? (
							<ActionIcon
								disabled={viewLoading}
								size="xl"
								variant={
									viewPanel === "settings" && !viewLoading ? "filled" : "subtle"
								}
								color="gray"
								onClick={props.onSettings}
								aria-label="Settings"
								aria-pressed={viewPanel === "settings"}
							>
								<Icon icon="settings" title="Settings" height={16} width={16} />
							</ActionIcon>
						) : null}
					</ActionIcon.Group>
				</AppShell.Section>
			</AppShell.Navbar>
			{/* biome-ignore lint/correctness/useUniqueElementIds: skip-link target is the single main landmark */}
			<AppShell.Main id="main" tabIndex={-1}>
				{viewLoading ? (
					<Center p="xl" role="status" aria-label="Loading…">
						<Loader color="gray" size="xl" type="bars" />
					</Center>
				) : null}
				{!viewLoading && hasPanels ? (
					<Splitter
						orientation="horizontal"
						sizes={sizesOverride}
						onSizeChange={onSizeChange}
						h="calc(100dvh - 1.8em)"
						withHandle={false}
						lineSize={0}
						classNames={{ handle: styles.handle }}
					>
						<Splitter.Pane
							defaultSize={20}
							min={5}
							collapsible
							style={PANE_STYLE}
							data-panel-active-id={viewPanel ?? ""}
							className={styles.panelAside}
						>
							<Box h="100%" style={ASIDE_BORDER_STYLE}>
								{(props.panelData ?? []).map((panelItem) => (
									<React.Activity
										key={panelItem.id}
										mode={panelItem.id === viewPanel ? "visible" : "hidden"}
									>
										{panelItem.Component ? (
											<InterfaceShellPanel title={panelItem.title}>
												<panelItem.Component />
											</InterfaceShellPanel>
										) : null}
									</React.Activity>
								))}
							</Box>
						</Splitter.Pane>
						<Splitter.Pane
							defaultSize={80}
							min={10}
							style={PANE_STYLE}
							className={styles.panelMain}
						>
							{main}
						</Splitter.Pane>
					</Splitter>
				) : null}
				{/* biome-ignore lint/suspicious/noLeakedRender: main is a JSX element, not a primitive */}
				{viewLoading || hasPanels ? null : main}
			</AppShell.Main>
			<AppShell.Footer display="flex" bg="var(--mantine-color-disabled)">
				<InterfaceShellStatus />
			</AppShell.Footer>
		</AppShell>
	);
}

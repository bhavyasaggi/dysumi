import {
	ActionIcon,
	AppShell,
	Box,
	Center,
	Divider,
	Loader,
	Stack,
} from "@mantine/core";
import type { FeatherIconNames } from "feather-icons";
import React, { useEffect, useId } from "react";
import {
	Panel,
	Group as PanelGroup,
	Separator,
	useGroupRef,
} from "react-resizable-panels";

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

	const reactId = useId();
	const asidePanelId = `resizable-aside-${reactId}`;
	const mainPanelId = `resizable-main-${reactId}`;

	const panelGroupRef = useGroupRef();
	// biome-ignore lint/correctness/useExhaustiveDependencies: resize-bug
	useEffect(() => {
		const layout = panelGroupRef.current?.getLayout();
		const asidePanelWidth = layout?.[asidePanelId] ?? 0;
		if (viewPanel && asidePanelWidth <= 0) {
			panelGroupRef.current?.setLayout({
				[asidePanelId]: 20,
				[mainPanelId]: 80,
			});
		}
		if (!viewPanel && asidePanelWidth > 0) {
			panelGroupRef.current?.setLayout({
				[asidePanelId]: 0,
				[mainPanelId]: 100,
			});
		}
	}, [viewPanel]);

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
						<ActionIcon component={Link} to="/" variant="transparent" w="46px">
							<Image
								src="/favicon-32x32.png"
								fit="contain"
								height={16}
								width={16}
								alt="Logo"
							/>
						</ActionIcon>
						{props.panelData?.map((panelItem) => {
							const isActive = panelItem.id === viewPanel;
							return (
								<ActionIcon
									disabled={viewLoading}
									key={panelItem.id}
									variant={isActive && !viewLoading ? "filled" : "subtle"}
									color="gray"
									size="xl"
									onClick={() => {
										props.onPanel(isActive ? undefined : panelItem.id);
									}}
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
								variant="subtle"
								color="gray"
								onClick={props.onSettings}
							>
								<Icon icon="settings" title="Settings" height={16} width={16} />
							</ActionIcon>
						) : null}
					</ActionIcon.Group>
				</AppShell.Section>
			</AppShell.Navbar>
			<AppShell.Main>
				{viewLoading ? (
					<Center p="xl">
						<Loader color="gray" size="xl" type="bars" />
					</Center>
				) : null}
				{!viewLoading && hasPanels ? (
					<PanelGroup
						groupRef={panelGroupRef}
						orientation="horizontal"
						onLayoutChange={(layout) => {
							const layoutAside = layout[asidePanelId] ?? 0;
							if (layoutAside <= 0) {
								props.onPanel(undefined);
							} else if (!viewPanel) {
								props.onPanel(props.panelData?.[0].id || undefined);
							}
						}}
					>
						<Panel
							id={asidePanelId}
							minSize="5%"
							collapsible
							defaultSize="20%"
							data-panel-active-id={viewPanel ?? ""}
							className={styles.panelAside}
						>
							<Box h="calc(100dvh - 1.8em)" style={ASIDE_BORDER_STYLE}>
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
						</Panel>
						<Separator />
						<Panel id={mainPanelId} minSize="10%" defaultSize="80%">
							{main}
						</Panel>
					</PanelGroup>
				) : null}
				{/* biome-ignore lint/nursery/noLeakedRender: main is a JSX element, not a primitive */}
				{viewLoading || hasPanels ? null : main}
			</AppShell.Main>
			<AppShell.Footer display="flex" bg="var(--mantine-color-disabled)">
				<InterfaceShellStatus />
			</AppShell.Footer>
		</AppShell>
	);
}

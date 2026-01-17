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
import type React from "react";
import { Activity, useEffect, useRef } from "react";
import {
	type ImperativePanelGroupHandle,
	Panel,
	PanelGroup,
	PanelResizeHandle,
} from "react-resizable-panels";
import Icon from "@/lib/ui/Icon";
import Image from "@/lib/ui/Image";
import Link from "@/lib/ui/Link";

import styles from "./styles.module.scss";

type RenderFunctionType = (
	panel: string | undefined,
	options: {
		loading?: boolean;
	},
) => React.ReactNode;

export interface InterfaceShellProps {
	readonly loading?: boolean;
	readonly panel: string | undefined;
	readonly panelData?: Array<{
		id: string;
		icon: FeatherIconNames;
		title: string;
		render?: RenderFunctionType;
	}>;
	readonly onPanel: (panel: string | undefined) => void;
	readonly onSettings?: () => void;
	readonly children?: React.ReactNode;
	readonly renderActivity?: RenderFunctionType;
	readonly renderFooter?: RenderFunctionType;
}

// Controlled
export default function InterfaceShell(props: InterfaceShellProps) {
	const viewLoading = props.loading;
	const viewPanel = props.panel;

	const hasPanels = props.panelData && props.panelData.length > 0;

	const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
	useEffect(() => {
		const [asidePanelWidth] = panelGroupRef.current?.getLayout() || [];
		if (viewPanel && asidePanelWidth <= 0) {
			panelGroupRef.current?.setLayout([20, 80]);
		}
		if (!viewPanel && asidePanelWidth > 0) {
			panelGroupRef.current?.setLayout([0, 100]);
		}
	}, [viewPanel]);

	const main = (
		<Stack h="calc(100dvh - 1.8em)" gap={0}>
			<Box flex="0 0 auto">
				{props.renderActivity?.(viewPanel, { loading: viewLoading })}
				{props.renderActivity ? <Divider /> : null}
			</Box>
			<Box flex="1 1 auto" style={{ overflow: "auto" }}>
				{props.children}
			</Box>
		</Stack>
	);

	return (
		<AppShell
			footer={{ height: "1.8em" }}
			navbar={{
				width: "46px",
				breakpoint: "0",
			}}
		>
			<AppShell.Navbar
				bg="var(--mantine-color-disabled)"
				styles={{
					navbar: {
						alignItems: "center",
					},
				}}
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
					<Center my="xl" p="xl">
						<Loader color="gray" size="xl" type="bars" />
					</Center>
				) : null}
				{!viewLoading && hasPanels ? (
					<PanelGroup
						ref={panelGroupRef}
						autoSaveId="__resizable-aside-main"
						// storage={memoryPanelStorage}
						direction="horizontal"
						onLayout={([layoutAside]) => {
							if (layoutAside <= 0) {
								props.onPanel(undefined);
							} else if (!viewPanel) {
								props.onPanel(props.panelData?.[0].id || undefined);
							}
						}}
					>
						<Panel
							id="__resizable-aside"
							minSize={5}
							collapsible
							defaultSize={20}
							data-panel-active-id={viewPanel || ""}
							className={styles.panelAside}
						>
							<Box
								h="calc(100dvh - 1.8em)"
								style={{
									borderRight: "1px solid var(--mantine-color-default-border)",
									backgroundColor: "var(--mantine-color-default-hover)",
								}}
							>
								{(props.panelData || []).map((panelItem) => (
									<Activity
										key={panelItem.id}
										mode={panelItem.id === viewPanel ? "visible" : "hidden"}
									>
										{panelItem.render?.(viewPanel, {
											loading: viewLoading,
										})}
									</Activity>
								))}
							</Box>
						</Panel>
						<PanelResizeHandle />
						<Panel id="__resizable-main" minSize={10} defaultSize={80}>
							{main}
						</Panel>
					</PanelGroup>
				) : null}
				{!viewLoading && !hasPanels ? main : null}
			</AppShell.Main>
			<AppShell.Footer display="flex" bg="var(--mantine-color-disabled)">
				{props.renderFooter?.(viewPanel, {
					loading: viewLoading,
				})}
			</AppShell.Footer>
		</AppShell>
	);
}

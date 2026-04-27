import {
	ActionIcon,
	ColorSwatch,
	Divider,
	Group,
	ScrollArea,
	Text,
	Tree,
	type TreeNodeData,
	useTree,
} from "@mantine/core";
import type { FeatherIconNames } from "feather-icons";
import { useState } from "react";
import Icon from "@/lib/ui/Icon";
import { DEFAULT_COLOR } from "@/lib/utils/kml";
import styles from "../styles.module.scss";

const GEOMETRY_ICONS: Record<string, FeatherIconNames> = {
	Point: "map-pin",
	LineString: "minus",
	Polygon: "square",
	MultiPoint: "map-pin",
	MultiLineString: "minus",
	MultiPolygon: "square",
};

const GEOMETRY_LABELS: Record<string, string> = {
	Point: "Point",
	LineString: "Line",
	Polygon: "Polygon",
	MultiPoint: "Points",
	MultiLineString: "Lines",
	MultiPolygon: "Polygons",
};

const FEATURE_PREFIX = "feature:";

function renderTreeNode({
	node,
	expanded,
	hasChildren,
	selected,
	elementProps,
}: {
	node: TreeNodeData;
	expanded: boolean;
	hasChildren: boolean;
	selected: boolean;
	elementProps: Record<string, unknown>;
}) {
	const isFeature = node.value.startsWith(FEATURE_PREFIX);
	const geoType = isFeature
		? ((node.nodeProps?.["data-geo-type"] as string) ?? "Point")
		: null;
	const color = isFeature
		? ((node.nodeProps?.["data-color"] as string) ?? DEFAULT_COLOR)
		: null;

	return (
		<Group
			gap="xs"
			wrap="nowrap"
			py={3}
			px="xs"
			{...elementProps}
			className={isFeature ? styles.legendItem : styles.legendFolder}
			data-selected={selected || undefined}
		>
			{hasChildren ? (
				<Icon
					icon={expanded ? "chevron-down" : "chevron-right"}
					title={expanded ? "Collapse" : "Expand"}
					height={10}
					width={10}
					className={styles.legendIcon}
				/>
			) : null}
			{color ? (
				<ColorSwatch color={color} size={10} className={styles.legendIcon} />
			) : null}
			<Icon
				icon={
					isFeature ? (GEOMETRY_ICONS[geoType as string] ?? "map") : "folder"
				}
				title={
					isFeature
						? (GEOMETRY_LABELS[geoType as string] ?? "Feature")
						: "Folder"
				}
				height={12}
				width={12}
				className={styles.legendIcon}
			/>
			<Text
				size="xs"
				truncate="end"
				flex="1 1 auto"
				fw={hasChildren ? 600 : undefined}
			>
				{node.label}
			</Text>
		</Group>
	);
}

export default function ViewerKMLLegend({
	data,
	onSelect,
	featureCount,
}: {
	data: TreeNodeData[];
	onSelect?: (selected: string[]) => void;
	featureCount: number;
}) {
	const [legendOpen, setLegendOpen] = useState(true);

	const tree = useTree({
		initialExpandedState: Object.fromEntries(
			data.filter((n) => n.children).map((n) => [n.value, true]),
		),
		onSelectedStateChange: onSelect,
	});

	return (
		<div className={styles.legend} data-open={legendOpen || undefined}>
			<Group gap={0} wrap="nowrap" className={styles.legendHeader}>
				{legendOpen ? (
					<Text size="xs" fw={600} flex="1 1 auto" truncate="end" px="xs">
						Places ({featureCount})
					</Text>
				) : null}
				<ActionIcon
					variant="subtle"
					color="gray"
					size="sm"
					onClick={() => setLegendOpen((v) => !v)}
				>
					<Icon
						icon={legendOpen ? "chevron-right" : "list"}
						title="Toggle legend"
						height={14}
						width={14}
					/>
				</ActionIcon>
			</Group>
			{legendOpen ? (
				<>
					<Divider />
					<ScrollArea flex="1 1 auto" scrollbars="y">
						<Tree
							data={data}
							tree={tree}
							levelOffset={16}
							selectOnClick
							renderNode={renderTreeNode}
						/>
					</ScrollArea>
				</>
			) : null}
		</div>
	);
}

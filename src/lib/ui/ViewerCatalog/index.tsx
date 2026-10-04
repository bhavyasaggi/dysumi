import {
	Badge,
	Group,
	ScrollArea,
	Table,
	Text,
	TextInput,
} from "@mantine/core";
import { type ChangeEvent, useCallback, useMemo, useState } from "react";
import type { CatalogDocument } from "@/lib/utils/catalog/parse";
import styles from "./styles.module.scss";

function filled(value: string, fallback: string): string {
	return value ? value : fallback;
}

export default function ViewerCatalog({
	document,
}: {
	document: CatalogDocument;
}) {
	const [query, setQuery] = useState("");
	const onQuery = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setQuery(event.currentTarget.value);
	}, []);
	const messages = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return document.messages;
		return document.messages.filter((message) =>
			[
				message.id,
				message.source,
				message.target,
				message.description,
				message.notes,
			]
				.join("\n")
				.toLowerCase()
				.includes(needle),
		);
	}, [document.messages, query]);

	return (
		<div className={styles.layout}>
			<Group className={styles.bar} justify="space-between" wrap="wrap">
				<Group gap="xs">
					<Text fw={600}>{document.title}</Text>
					<Badge variant="light">{document.messages.length}</Badge>
					{document.locale ? (
						<Badge color="gray">{document.locale}</Badge>
					) : null}
					{document.targetLocale ? (
						<Badge color="gray">{document.targetLocale}</Badge>
					) : null}
				</Group>
				<TextInput
					aria-label="Filter messages"
					placeholder="Filter messages…"
					value={query}
					onChange={onQuery}
					w={240}
				/>
			</Group>
			<ScrollArea className={styles.tableWrap} scrollbars="y">
				<Table stickyHeader horizontalSpacing="sm" verticalSpacing={6}>
					<Table.Thead>
						<Table.Tr>
							<Table.Th>Id</Table.Th>
							<Table.Th>Source</Table.Th>
							<Table.Th>Translation</Table.Th>
							<Table.Th>Notes</Table.Th>
						</Table.Tr>
					</Table.Thead>
					<Table.Tbody>
						{messages.map((message) => (
							<Table.Tr key={`${message.id}:${message.source}`}>
								<Table.Td className={styles.id}>{message.id}</Table.Td>
								<Table.Td className={styles.cell}>{message.source}</Table.Td>
								<Table.Td className={styles.cell}>
									{filled(message.target, "—")}
								</Table.Td>
								<Table.Td className={styles.cell}>
									{[message.description, message.notes]
										.filter(Boolean)
										.join("\n")}
								</Table.Td>
							</Table.Tr>
						))}
					</Table.Tbody>
				</Table>
			</ScrollArea>
		</div>
	);
}

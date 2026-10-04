import { Button, Image, ScrollArea, Stack, Text } from "@mantine/core";
import { useCallback, useState } from "react";
import type { VCard } from "@/lib/utils/vcard/types";
import styles from "./styles.module.scss";

function CardButton({
	card,
	index,
	active,
	onSelect,
}: {
	card: VCard;
	index: number;
	active: boolean;
	onSelect: (index: number) => void;
}) {
	const select = useCallback(() => {
		onSelect(index);
	}, [index, onSelect]);
	return (
		<Button
			variant={active ? "light" : "subtle"}
			justify="flex-start"
			onClick={select}
		>
			{card.name}
		</Button>
	);
}

function CardDetail({ card }: { card: VCard }) {
	return (
		<Stack gap="sm" p="md">
			<Text fw={700} size="lg">
				{card.name}
			</Text>
			{card.photo ? (
				<Image src={card.photo} alt={card.name} maw={180} radius="md" />
			) : null}
			{card.fields.map((field) => (
				<div key={`${field.label}:${field.value}`}>
					<Text size="xs" c="dimmed">
						{field.label}
					</Text>
					<Text className={styles.value}>{field.value}</Text>
				</div>
			))}
		</Stack>
	);
}

export default function ViewerVCard({ cards }: { cards: VCard[] }) {
	const [index, setIndex] = useState(0);
	const card = cards[Math.min(index, cards.length - 1)];
	const select = useCallback((next: number) => {
		setIndex(next);
	}, []);
	if (!card) return null;
	return (
		<div className={styles.layout}>
			<ScrollArea className={styles.list} scrollbars="y">
				<Stack gap={4} p="xs">
					{cards.map((item, itemIndex) => (
						<CardButton
							key={item.id}
							card={item}
							index={itemIndex}
							active={itemIndex === index}
							onSelect={select}
						/>
					))}
				</Stack>
			</ScrollArea>
			<ScrollArea className={styles.detail} scrollbars="y">
				<CardDetail card={card} />
			</ScrollArea>
		</div>
	);
}

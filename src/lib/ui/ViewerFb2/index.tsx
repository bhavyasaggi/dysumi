import { Button, Center, Loader, ScrollArea, Stack, Text } from "@mantine/core";
import { type Fb2Book, makeFB2 } from "foliate-js/fb2.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { mountSafeHtml } from "@/lib/ui/safe-html";
import styles from "./styles.module.scss";

interface Fb2NavItem {
	id: string;
	label: string;
	index: number;
}

function personName(person: { name?: string } | string): string {
	return typeof person === "string" ? person : (person.name ?? "");
}

function navOf(book: Fb2Book): Fb2NavItem[] {
	return book.sections.map((section, index) => {
		const label = book.toc[index]?.label || `Section ${index + 1}`;
		const size = section.createDocument().body?.innerHTML.length ?? 0;
		return { id: `${label}:${size}:${index}`, label, index };
	});
}

function sectionHtml(book: Fb2Book, index: number): string {
	return book.sections[index]?.createDocument().body?.innerHTML ?? "";
}

function BookPage({ html }: { html: string }) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (ref.current) mountSafeHtml(ref.current, html);
	}, [html]);
	return <div ref={ref} className={styles.page} />;
}

function SectionButton({
	label,
	index,
	active,
	onSelect,
}: {
	label: string;
	index: number;
	active: boolean;
	onSelect: (index: number) => void;
}) {
	const select = useCallback(() => {
		onSelect(index);
	}, [index, onSelect]);
	return (
		<Button
			size="compact-sm"
			variant={active ? "light" : "subtle"}
			justify="flex-start"
			onClick={select}
		>
			{label}
		</Button>
	);
}

export default function ViewerFb2({ bytes }: { bytes: Uint8Array }) {
	const [book, setBook] = useState<Fb2Book | null>(null);
	const [nav, setNav] = useState<Fb2NavItem[]>([]);
	const [error, setError] = useState("");
	const [attempt, setAttempt] = useState(0);
	const [index, setIndex] = useState(0);
	const retry = useCallback(() => {
		setError("");
		setAttempt((value) => value + 1);
	}, []);
	const select = useCallback((next: number) => {
		setIndex(next);
	}, []);

	useEffect(() => {
		let cancelled = attempt < 0;
		let active: Fb2Book | null = null;
		const blob = new Blob([new Uint8Array(bytes)], {
			type: "application/xml",
		});
		makeFB2(blob)
			.then((next) => {
				if (cancelled) {
					next.destroy();
					return;
				}
				active = next;
				setBook(next);
				setNav(navOf(next));
				setIndex(0);
			})
			.catch((reason: unknown) => {
				if (!cancelled) {
					setError(reason instanceof Error ? reason.message : String(reason));
				}
			});
		return () => {
			cancelled = true;
			active?.destroy();
		};
	}, [attempt, bytes]);

	if (error) {
		return (
			<Center py="xl" px="sm">
				<Stack align="center" gap="sm">
					<Text c="red" ta="center" role="alert">
						{error}
					</Text>
					<Button variant="light" onClick={retry}>
						Try again
					</Button>
				</Stack>
			</Center>
		);
	}
	if (!book) {
		return (
			<Center py="xl" role="status" aria-label="Loading…">
				<Loader color="gray" />
			</Center>
		);
	}

	const authors = (book.metadata.author ?? [])
		.map((person) => personName(person))
		.filter(Boolean)
		.join(", ");
	const section = Math.min(index, Math.max(book.sections.length - 1, 0));
	return (
		<div className={styles.layout}>
			<ScrollArea className={styles.toc} scrollbars="y">
				<Stack gap={4} p="xs">
					<Text fw={700} size="sm">
						{book.metadata.title || "FictionBook"}
					</Text>
					{authors ? (
						<Text size="xs" c="dimmed">
							{authors}
						</Text>
					) : null}
					{nav.map((item) => (
						<SectionButton
							key={item.id}
							label={item.label}
							index={item.index}
							active={item.index === section}
							onSelect={select}
						/>
					))}
				</Stack>
			</ScrollArea>
			<BookPage html={sectionHtml(book, section)} />
		</div>
	);
}

import { Button, ScrollArea, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChmArchive, type ChmTocItem, isHtmlPath } from "web-chm-reader";
import { mountSafeHtml } from "@/lib/ui/safe-html";
import styles from "./styles.module.scss";

function TocButton({
	item,
	active,
	onOpen,
}: {
	item: ChmTocItem;
	active: string;
	onOpen: (path: string) => void;
}) {
	const open = useCallback(() => {
		if (item.path) onOpen(item.path);
	}, [item.path, onOpen]);
	return (
		<Button
			size="compact-sm"
			variant={active === item.path ? "light" : "subtle"}
			justify="flex-start"
			onClick={open}
		>
			{item.label}
		</Button>
	);
}

function TocList({
	items,
	active,
	onOpen,
}: {
	items: readonly ChmTocItem[];
	active: string;
	onOpen: (path: string) => void;
}) {
	return (
		<Stack gap={4}>
			{items.map((item) => (
				<div key={item.id}>
					{item.path ? (
						<TocButton item={item} active={active} onOpen={onOpen} />
					) : (
						<Text size="xs" fw={600}>
							{item.label}
						</Text>
					)}
					{item.children.length > 0 ? (
						<div className={styles.nest}>
							<TocList items={item.children} active={active} onOpen={onOpen} />
						</div>
					) : null}
				</div>
			))}
		</Stack>
	);
}

function firstPage(archive: ChmArchive): string {
	if (archive.metadata.defaultTopic) return archive.metadata.defaultTopic;
	const page = archive.entries.find((entry) => isHtmlPath(entry.path));
	return page?.path ?? "";
}

export default function ViewerChm({ bytes }: { bytes: Uint8Array }) {
	const pageRef = useRef<HTMLDivElement>(null);
	const archiveRef = useRef<ChmArchive | null>(null);
	const [title, setTitle] = useState("");
	const [toc, setToc] = useState<readonly ChmTocItem[]>([]);
	const [path, setPath] = useState("");
	const [attempt, setAttempt] = useState(0);
	const [opening, setOpening] = useState(true);
	const [error, setError] = useState("");
	const retry = useCallback(() => {
		setAttempt((value) => value + 1);
	}, []);
	const open = useCallback((next: string) => {
		const file = next.split("#")[0] ?? next;
		setPath(file);
	}, []);

	useEffect(() => {
		let cancelled = attempt < 0;
		setOpening(true);
		setError("");
		ChmArchive.open(bytes)
			.then((archive) => {
				if (cancelled) {
					archive.close();
					return;
				}
				archiveRef.current = archive;
				setTitle(archive.metadata.title || "Help");
				setToc(archive.toc);
				setPath(firstPage(archive));
				setOpening(false);
			})
			.catch((reason: unknown) => {
				if (!cancelled) {
					setOpening(false);
					setError(reason instanceof Error ? reason.message : String(reason));
				}
			});
		return () => {
			cancelled = true;
			archiveRef.current?.close();
			archiveRef.current = null;
		};
	}, [attempt, bytes]);

	useEffect(() => {
		const archive = archiveRef.current;
		const host = pageRef.current;
		if (!(archive && host && path)) return;
		let cancelled = false;
		archive
			.render(path)
			.then((page) => {
				if (cancelled || !pageRef.current) return;
				mountSafeHtml(pageRef.current, page.html);
				setTitle(page.title);
			})
			.catch((reason: unknown) => {
				if (!cancelled) {
					setError(reason instanceof Error ? reason.message : String(reason));
				}
			});
		return () => {
			cancelled = true;
		};
	}, [path]);

	useEffect(() => {
		const host = pageRef.current;
		if (!host) return;
		const onClick = (event: Event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const next = target.closest("a")?.dataset.chmPath;
			if (!next) return;
			event.preventDefault();
			open(next);
		};
		host.addEventListener("click", onClick);
		return () => host.removeEventListener("click", onClick);
	}, [open]);

	return (
		<div className={styles.layout}>
			<ScrollArea className={styles.toc} scrollbars="y">
				<Stack gap="xs" p="xs">
					<Text fw={700} size="sm">
						{title || "Help"}
					</Text>
					{error ? (
						<>
							<Text c="red" role="alert">
								{error}
							</Text>
							<Button variant="light" onClick={retry}>
								Try again
							</Button>
						</>
					) : null}
					{opening ? (
						<Text c="dimmed" role="status">
							Opening help…
						</Text>
					) : null}
					<TocList items={toc} active={path} onOpen={open} />
				</Stack>
			</ScrollArea>
			<div ref={pageRef} className={styles.page} />
		</div>
	);
}

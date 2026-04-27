import {
	ActionIcon,
	Box,
	Divider,
	Flex,
	Group,
	Paper,
	ScrollArea,
	Stack,
	Table,
	Text,
	Tooltip,
} from "@mantine/core";
import React, {
	type KeyboardEvent,
	type MouseEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import styles from "./styles.module.scss";

const BYTES_PER_ROW = 16;
const VISIBLE_ROWS = 32;

interface EditorHexProps {
	defaultValue?: Uint8Array;
}

const byteToHex = (byte: number): string =>
	byte.toString(16).padStart(2, "0").toUpperCase();

const isPrintable = (byte: number): boolean => byte >= 0x20 && byte <= 0x7e;

const byteToAscii = (byte: number): string =>
	isPrintable(byte) ? String.fromCharCode(byte) : ".";

interface DataInspection {
	label: string;
	value: string;
}

const inspectData = (
	data: Uint8Array,
	offset: number,
	littleEndian = true,
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: data inspector with many type conversions
): DataInspection[] => {
	const results: DataInspection[] = [];
	if (data.length === 0 || offset >= data.length || offset < 0) return results;

	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

	results.push({ label: "Int8", value: String(view.getInt8(offset)) });
	results.push({ label: "UInt8", value: String(view.getUint8(offset)) });
	results.push({
		label: "Binary",
		value: data[offset].toString(2).padStart(8, "0"),
	});
	results.push({
		label: "Octal",
		value: data[offset].toString(8).padStart(3, "0"),
	});

	if (offset + 1 < data.length) {
		try {
			results.push({
				label: `Int16 (${littleEndian ? "LE" : "BE"})`,
				value: String(view.getInt16(offset, littleEndian)),
			});
			results.push({
				label: `UInt16 (${littleEndian ? "LE" : "BE"})`,
				value: String(view.getUint16(offset, littleEndian)),
			});
		} catch {
			/* offset too close to end */
		}
	}

	if (offset + 3 < data.length) {
		try {
			results.push({
				label: `Int32 (${littleEndian ? "LE" : "BE"})`,
				value: String(view.getInt32(offset, littleEndian)),
			});
			results.push({
				label: `UInt32 (${littleEndian ? "LE" : "BE"})`,
				value: String(view.getUint32(offset, littleEndian)),
			});
			results.push({
				label: `Float32 (${littleEndian ? "LE" : "BE"})`,
				value: String(view.getFloat32(offset, littleEndian)),
			});
		} catch {
			/* offset too close to end */
		}
	}

	if (offset + 7 < data.length) {
		try {
			results.push({
				label: `Int64 (${littleEndian ? "LE" : "BE"})`,
				value: String(view.getBigInt64(offset, littleEndian)),
			});
			results.push({
				label: `UInt64 (${littleEndian ? "LE" : "BE"})`,
				value: String(view.getBigUint64(offset, littleEndian)),
			});
			results.push({
				label: `Float64 (${littleEndian ? "LE" : "BE"})`,
				value: String(view.getFloat64(offset, littleEndian)),
			});
		} catch {
			/* offset too close to end */
		}
	}

	return results;
};

export default function EditorHex({ defaultValue }: EditorHexProps) {
	const data = useMemo(() => defaultValue ?? new Uint8Array(0), [defaultValue]);
	const [cursor, setCursor] = useState(0);
	const [selection, setSelection] = useState<{
		start: number;
		end: number;
	} | null>(null);
	const [scrollOffset, setScrollOffset] = useState(0);
	const [littleEndian, setLittleEndian] = useState(true);

	const containerRef = useRef<HTMLDivElement>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	const totalRows = Math.ceil(data.length / BYTES_PER_ROW);
	const startRow = scrollOffset;
	const endRow = Math.min(startRow + VISIBLE_ROWS, totalRows);

	const getSelectionRange = useCallback(() => {
		if (!selection) return null;
		return {
			start: Math.min(selection.start, selection.end),
			end: Math.max(selection.start, selection.end),
		};
	}, [selection]);

	const _copyToClipboard = useCallback(async () => {
		const range = getSelectionRange();
		if (!range) {
			await navigator.clipboard.writeText(byteToHex(data[cursor] ?? 0));
			return;
		}
		const selectedBytes = data.slice(range.start, range.end + 1);
		await navigator.clipboard.writeText(
			Array.from(selectedBytes).map(byteToHex).join(" "),
		);
	}, [data, cursor, getSelectionRange]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLDivElement>) => {
			if (data.length === 0) return;

			if (
				[
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight",
					"Home",
					"End",
					"PageUp",
					"PageDown",
				].includes(e.key)
			) {
				e.preventDefault();
			}

			const shift = e.shiftKey;
			const updateSelection = (newPos: number) => {
				if (shift && !selection) {
					setSelection({ start: cursor, end: newPos });
				} else if (shift && selection) {
					setSelection({ ...selection, end: newPos });
				} else {
					setSelection(null);
				}
			};

			switch (e.key) {
				case "ArrowUp": {
					const p = Math.max(0, cursor - BYTES_PER_ROW);
					updateSelection(p);
					setCursor(p);
					break;
				}
				case "ArrowDown": {
					const p = Math.min(data.length - 1, cursor + BYTES_PER_ROW);
					updateSelection(p);
					setCursor(p);
					break;
				}
				case "ArrowLeft": {
					const p = Math.max(0, cursor - 1);
					updateSelection(p);
					setCursor(p);
					break;
				}
				case "ArrowRight": {
					const p = Math.min(data.length - 1, cursor + 1);
					updateSelection(p);
					setCursor(p);
					break;
				}
				case "Home": {
					const p = e.ctrlKey
						? 0
						: Math.floor(cursor / BYTES_PER_ROW) * BYTES_PER_ROW;
					setSelection(null);
					setCursor(p);
					break;
				}
				case "End": {
					const rowStart = Math.floor(cursor / BYTES_PER_ROW) * BYTES_PER_ROW;
					const p = e.ctrlKey
						? data.length - 1
						: Math.min(rowStart + BYTES_PER_ROW - 1, data.length - 1);
					setSelection(null);
					setCursor(p);
					break;
				}
				case "PageUp": {
					setCursor(Math.max(0, cursor - BYTES_PER_ROW * (VISIBLE_ROWS - 2)));
					setSelection(null);
					break;
				}
				case "PageDown": {
					setCursor(
						Math.min(
							data.length - 1,
							cursor + BYTES_PER_ROW * (VISIBLE_ROWS - 2),
						),
					);
					setSelection(null);
					break;
				}
				case "Escape": {
					setSelection(null);
					break;
				}
			}
		},
		[cursor, data.length, selection],
	);

	const handleByteClick = useCallback(
		(offset: number, e: MouseEvent) => {
			if (e.shiftKey && !selection) {
				setSelection({ start: cursor, end: offset });
			} else if (e.shiftKey && selection) {
				setSelection({ ...selection, end: offset });
			} else {
				setSelection(null);
			}
			setCursor(offset);
			containerRef.current?.focus();
		},
		[cursor, selection],
	);

	useEffect(() => {
		const cursorRow = Math.floor(cursor / BYTES_PER_ROW);
		if (cursorRow < scrollOffset) {
			setScrollOffset(cursorRow);
		} else if (cursorRow >= scrollOffset + VISIBLE_ROWS - 2) {
			setScrollOffset(Math.max(0, cursorRow - VISIBLE_ROWS + 3));
		}
	}, [cursor, scrollOffset]);

	const handleScroll = useCallback(
		(e: React.WheelEvent) => {
			e.preventDefault();
			const delta = Math.sign(e.deltaY) * 3;
			setScrollOffset((prev) =>
				Math.max(0, Math.min(totalRows - VISIBLE_ROWS, prev + delta)),
			);
		},
		[totalRows],
	);

	const isSelected = useCallback(
		(offset: number) => {
			const range = getSelectionRange();
			if (!range) return false;
			return offset >= range.start && offset <= range.end;
		},
		[getSelectionRange],
	);

	const inspections = useMemo(
		() => inspectData(data, cursor, littleEndian),
		[data, cursor, littleEndian],
	);

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: hex grid rendering with many conditional styles
	const rows = useMemo(() => {
		const result: React.ReactNode[] = [];

		for (let row = startRow; row < endRow; row++) {
			const rowOffset = row * BYTES_PER_ROW;
			const hexCells: React.ReactNode[] = [];
			const asciiCells: React.ReactNode[] = [];

			for (let col = 0; col < BYTES_PER_ROW; col++) {
				const offset = rowOffset + col;
				const isValidOffset = offset < data.length;
				const byte = isValidOffset ? data[offset] : 0;
				const isCursor = offset === cursor;
				const inSelection = isSelected(offset);

				if (col === 8) {
					hexCells.push(
						<span key={`sep-${row}`} className={styles.hexSeparator} />,
					);
				}

				hexCells.push(
					// biome-ignore lint/a11y/useSemanticElements: custom hex grid layout, not a table
					<span
						key={`hex-${offset}`}
						className={`${styles.hexByte} ${isCursor ? styles.cursor : ""} ${
							inSelection ? styles.selected : ""
						} ${isValidOffset ? "" : styles.empty}`}
						onClick={(e) => isValidOffset && handleByteClick(offset, e)}
						onKeyDown={() => {
							/* a11y */
						}}
						role="gridcell"
						tabIndex={-1}
						data-offset={offset}
					>
						{isValidOffset ? byteToHex(byte) : "  "}
					</span>,
				);

				asciiCells.push(
					// biome-ignore lint/a11y/useSemanticElements: custom hex grid layout, not a table
					<span
						key={`ascii-${offset}`}
						className={`${styles.asciiByte} ${isCursor ? styles.cursor : ""} ${
							inSelection ? styles.selected : ""
						} ${isValidOffset ? "" : styles.empty} ${isPrintable(byte) ? "" : styles.nonPrintable}`}
						onClick={(e) => isValidOffset && handleByteClick(offset, e)}
						onKeyDown={() => {
							/* a11y */
						}}
						role="gridcell"
						tabIndex={-1}
						data-offset={offset}
					>
						{isValidOffset ? byteToAscii(byte) : " "}
					</span>,
				);
			}

			result.push(
				<div key={`row-${row}`} className={styles.hexRow}>
					<span className={styles.offset}>
						{rowOffset.toString(16).padStart(8, "0").toUpperCase()}
					</span>
					<span className={styles.hexCells}>{hexCells}</span>
					<span className={styles.asciiCells}>{asciiCells}</span>
				</div>,
			);
		}

		return result;
	}, [data, startRow, endRow, cursor, isSelected, handleByteClick]);

	return (
		<Flex className={styles.hexEditor} h="100%">
			<Box
				className={styles.editorContainer}
				ref={containerRef}
				tabIndex={0}
				onKeyDown={handleKeyDown}
				onWheel={handleScroll}
				role="grid"
				aria-label="Hex Viewer"
				style={{ flex: 1, outline: "none" }}
			>
				<ScrollArea
					ref={scrollAreaRef}
					className={styles.scrollArea}
					type="scroll"
					offsetScrollbars
				>
					{data.length === 0 ? (
						<Box p="xl" ta="center">
							<Text c="dimmed" size="sm">
								No data to display
							</Text>
						</Box>
					) : (
						<div className={styles.hexContent}>{rows}</div>
					)}
				</ScrollArea>
			</Box>

			<Paper
				className={styles.inspector}
				withBorder
				p="xs"
				style={{ width: "240px", overflowY: "auto" }}
			>
				<Stack gap="xs">
					<Group justify="space-between">
						<Text size="sm" fw={500}>
							Data Inspector
						</Text>
						<Tooltip label="Toggle Endianness">
							<ActionIcon
								variant="subtle"
								size="xs"
								onClick={() => setLittleEndian((v) => !v)}
							>
								<Text size="xs">{littleEndian ? "LE" : "BE"}</Text>
							</ActionIcon>
						</Tooltip>
					</Group>
					<Divider />
					<Text size="xs" c="dimmed">
						Offset: 0x{cursor.toString(16).toUpperCase()} | Size:{" "}
						{data.length.toLocaleString()} bytes
					</Text>
					<Table verticalSpacing={2}>
						<Table.Tbody>
							{inspections.map((item) => (
								<Table.Tr key={item.label}>
									<Table.Td>
										<Text size="xs" c="dimmed">
											{item.label}
										</Text>
									</Table.Td>
									<Table.Td>
										<Text
											size="xs"
											ff="monospace"
											style={{ wordBreak: "break-all" }}
										>
											{item.value}
										</Text>
									</Table.Td>
								</Table.Tr>
							))}
						</Table.Tbody>
					</Table>

					{selection ? (
						<>
							<Divider />
							<Text size="xs" c="dimmed">
								Selection: 0x
								{Math.min(selection.start, selection.end)
									.toString(16)
									.toUpperCase()}{" "}
								- 0x
								{Math.max(selection.start, selection.end)
									.toString(16)
									.toUpperCase()}{" "}
								({Math.abs(selection.end - selection.start) + 1} bytes)
							</Text>
						</>
					) : null}
				</Stack>
			</Paper>
		</Flex>
	);
}

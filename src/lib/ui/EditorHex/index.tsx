// Inspired by ImHex and VS Code Hex Editor
// https://github.com/microsoft/vscode-hexeditor

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
	TextInput,
	Tooltip,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import React, {
	type KeyboardEvent,
	type MouseEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import Icon from "@/lib/ui/Icon";
import styles from "./styles.module.scss";

// Constants for layout
const BYTES_PER_ROW = 16;
const VISIBLE_ROWS = 32;

interface HistoryEntry {
	data: Uint8Array;
	cursor: number;
	selection: { start: number; end: number } | null;
}

interface EditorHexProps {
	defaultValue?: Uint8Array;
	onChange?: (value: Uint8Array) => void;
	readOnly?: boolean;
}

// Helper function to convert byte to hex string
const byteToHex = (byte: number): string => {
	return byte.toString(16).padStart(2, "0").toUpperCase();
};

// Helper to check if a character is printable ASCII
const isPrintable = (byte: number): boolean => {
	return byte >= 0x20 && byte <= 0x7e;
};

// Helper to convert byte to ASCII character
const byteToAscii = (byte: number): string => {
	return isPrintable(byte) ? String.fromCharCode(byte) : ".";
};

// Data inspector interpretations
interface DataInspection {
	label: string;
	value: string;
}

const inspectData = (
	data: Uint8Array,
	offset: number,
	littleEndian = true,
): DataInspection[] => {
	const results: DataInspection[] = [];

	// Handle empty buffer or out of bounds offset
	if (data.length === 0 || offset >= data.length || offset < 0) {
		return results;
	}

	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

	// Int8
	results.push({
		label: "Int8",
		value: String(view.getInt8(offset)),
	});

	// UInt8
	results.push({
		label: "UInt8",
		value: String(view.getUint8(offset)),
	});

	// Binary
	results.push({
		label: "Binary",
		value: data[offset].toString(2).padStart(8, "0"),
	});

	// Octal
	results.push({
		label: "Octal",
		value: data[offset].toString(8).padStart(3, "0"),
	});

	if (offset + 1 < data.length) {
		// Int16
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
			// Offset too close to end
		}
	}

	if (offset + 3 < data.length) {
		// Int32 / Float32
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
			// Offset too close to end
		}
	}

	if (offset + 7 < data.length) {
		// Int64 / Float64
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
			// Offset too close to end
		}
	}

	return results;
};

export default function EditorHex({
	defaultValue,
	onChange,
	readOnly = false,
}: EditorHexProps) {
	// Editor state
	const [data, setData] = useState<Uint8Array>(
		() => defaultValue || new Uint8Array(0),
	);
	const [cursor, setCursor] = useState(0);
	const [selection, setSelection] = useState<{
		start: number;
		end: number;
	} | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [editNibble, setEditNibble] = useState<"high" | "low">("high");
	const [scrollOffset, setScrollOffset] = useState(0);
	const [littleEndian, setLittleEndian] = useState(true);
	const [gotoValue, setGotoValue] = useState("");

	// History for undo/redo
	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);

	const containerRef = useRef<HTMLDivElement>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	// Calculate rows
	const totalRows = Math.ceil(data.length / BYTES_PER_ROW);
	const startRow = scrollOffset;
	const endRow = Math.min(startRow + VISIBLE_ROWS, totalRows);

	// Initialize history with initial data
	useEffect(() => {
		if (defaultValue && history.length === 0) {
			setHistory([
				{ data: new Uint8Array(defaultValue), cursor: 0, selection: null },
			]);
			setHistoryIndex(0);
		}
	}, [defaultValue, history.length]);

	// Push to history
	const pushHistory = useCallback(
		(newData: Uint8Array, newCursor: number) => {
			const newEntry: HistoryEntry = {
				data: new Uint8Array(newData),
				cursor: newCursor,
				selection,
			};
			const newHistory = history.slice(0, historyIndex + 1);
			newHistory.push(newEntry);
			// Limit history size
			if (newHistory.length > 100) {
				newHistory.shift();
			}
			setHistory(newHistory);
			setHistoryIndex(newHistory.length - 1);
		},
		[history, historyIndex, selection],
	);

	// Undo
	const undo = useCallback(() => {
		if (historyIndex > 0) {
			const prevEntry = history[historyIndex - 1];
			setData(new Uint8Array(prevEntry.data));
			setCursor(prevEntry.cursor);
			setSelection(prevEntry.selection);
			setHistoryIndex(historyIndex - 1);
			onChange?.(new Uint8Array(prevEntry.data));
		}
	}, [history, historyIndex, onChange]);

	// Redo
	const redo = useCallback(() => {
		if (historyIndex < history.length - 1) {
			const nextEntry = history[historyIndex + 1];
			setData(new Uint8Array(nextEntry.data));
			setCursor(nextEntry.cursor);
			setSelection(nextEntry.selection);
			setHistoryIndex(historyIndex + 1);
			onChange?.(new Uint8Array(nextEntry.data));
		}
	}, [history, historyIndex, onChange]);

	// Handle byte modification
	const modifyByte = useCallback(
		(offset: number, value: number) => {
			if (readOnly || offset >= data.length) return;

			const newData = new Uint8Array(data);
			newData[offset] = value;
			setData(newData);
			pushHistory(newData, offset);
			onChange?.(newData);
		},
		[data, readOnly, pushHistory, onChange],
	);

	// Handle hex input
	const handleHexInput = useCallback(
		(char: string) => {
			if (readOnly) return;

			const hexValue = Number.parseInt(char, 16);
			if (Number.isNaN(hexValue)) return;

			const currentByte = data[cursor] || 0;

			let newValue: number;
			if (editNibble === "high") {
				newValue = (hexValue << 4) | (currentByte & 0x0f);
				setEditNibble("low");
			} else {
				newValue = (currentByte & 0xf0) | hexValue;
				setEditNibble("high");
				// Move to next byte after completing the byte
				if (cursor < data.length - 1) {
					setCursor(cursor + 1);
				}
			}

			modifyByte(cursor, newValue);
		},
		[data, cursor, editNibble, readOnly, modifyByte],
	);

	// Get selection range (normalized)
	const getSelectionRange = useCallback(() => {
		if (!selection) return null;
		const start = Math.min(selection.start, selection.end);
		const end = Math.max(selection.start, selection.end);
		return { start, end };
	}, [selection]);

	// Copy to clipboard
	const copyToClipboard = useCallback(async () => {
		const range = getSelectionRange();
		if (!range) {
			// Copy single byte
			const hexStr = byteToHex(data[cursor] || 0);
			await navigator.clipboard.writeText(hexStr);
			return;
		}

		const selectedBytes = data.slice(range.start, range.end + 1);
		const hexStr = Array.from(selectedBytes).map(byteToHex).join(" ");
		await navigator.clipboard.writeText(hexStr);
	}, [data, cursor, getSelectionRange]);

	// Paste from clipboard
	const pasteFromClipboard = useCallback(async () => {
		if (readOnly) return;

		try {
			const text = await navigator.clipboard.readText();
			// Parse hex string (supports formats: "AB CD EF" or "ABCDEF" or "AB,CD,EF")
			const hexStr = text.replace(/[\s,]/g, "");
			const bytes: number[] = [];

			for (let i = 0; i < hexStr.length; i += 2) {
				const byte = Number.parseInt(hexStr.substr(i, 2), 16);
				if (!Number.isNaN(byte)) {
					bytes.push(byte);
				}
			}

			if (bytes.length === 0) return;

			const newData = new Uint8Array(data);
			for (let i = 0; i < bytes.length && cursor + i < data.length; i++) {
				newData[cursor + i] = bytes[i];
			}

			setData(newData);
			pushHistory(newData, cursor + bytes.length - 1);
			onChange?.(newData);
			setCursor(Math.min(cursor + bytes.length - 1, data.length - 1));
		} catch {
			// Clipboard access denied or invalid data
		}
	}, [data, cursor, readOnly, pushHistory, onChange]);

	// Handle keyboard navigation
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLDivElement>) => {
			// If data is empty, ignore most keys
			if (data.length === 0) {
				return;
			}

			// Prevent default for most keys to avoid browser shortcuts
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

			switch (e.key) {
				case "ArrowUp": {
					const newPos = Math.max(0, cursor - BYTES_PER_ROW);
					if (shift && !selection) {
						setSelection({ start: cursor, end: newPos });
					} else if (shift && selection) {
						setSelection({ ...selection, end: newPos });
					} else {
						setSelection(null);
					}
					setCursor(newPos);
					setEditNibble("high");
					break;
				}
				case "ArrowDown": {
					const newPos = Math.min(data.length - 1, cursor + BYTES_PER_ROW);
					if (shift && !selection) {
						setSelection({ start: cursor, end: newPos });
					} else if (shift && selection) {
						setSelection({ ...selection, end: newPos });
					} else {
						setSelection(null);
					}
					setCursor(newPos);
					setEditNibble("high");
					break;
				}
				case "ArrowLeft": {
					const newPos = Math.max(0, cursor - 1);
					if (shift && !selection) {
						setSelection({ start: cursor, end: newPos });
					} else if (shift && selection) {
						setSelection({ ...selection, end: newPos });
					} else {
						setSelection(null);
					}
					setCursor(newPos);
					setEditNibble("high");
					break;
				}
				case "ArrowRight": {
					const newPos = Math.min(data.length - 1, cursor + 1);
					if (shift && !selection) {
						setSelection({ start: cursor, end: newPos });
					} else if (shift && selection) {
						setSelection({ ...selection, end: newPos });
					} else {
						setSelection(null);
					}
					setCursor(newPos);
					setEditNibble("high");
					break;
				}
				case "Home": {
					if (e.ctrlKey) {
						setCursor(0);
					} else {
						// Go to start of row
						setCursor(Math.floor(cursor / BYTES_PER_ROW) * BYTES_PER_ROW);
					}
					setSelection(null);
					setEditNibble("high");
					break;
				}
				case "End": {
					if (e.ctrlKey) {
						setCursor(data.length - 1);
					} else {
						// Go to end of row
						const rowStart = Math.floor(cursor / BYTES_PER_ROW) * BYTES_PER_ROW;
						setCursor(Math.min(rowStart + BYTES_PER_ROW - 1, data.length - 1));
					}
					setSelection(null);
					setEditNibble("high");
					break;
				}
				case "PageUp": {
					const newPos = Math.max(
						0,
						cursor - BYTES_PER_ROW * (VISIBLE_ROWS - 2),
					);
					setCursor(newPos);
					setSelection(null);
					setEditNibble("high");
					break;
				}
				case "PageDown": {
					const newPos = Math.min(
						data.length - 1,
						cursor + BYTES_PER_ROW * (VISIBLE_ROWS - 2),
					);
					setCursor(newPos);
					setSelection(null);
					setEditNibble("high");
					break;
				}
				case "Tab": {
					e.preventDefault();
					// Toggle between hex and ASCII editing mode
					setIsEditing(!isEditing);
					break;
				}
				case "Escape": {
					setSelection(null);
					setEditNibble("high");
					break;
				}
				default: {
					// Handle hex input (0-9, a-f, A-F)
					if (/^[0-9a-fA-F]$/.test(e.key) && !isEditing) {
						e.preventDefault();
						handleHexInput(e.key);
					}
					// Handle ASCII input in ASCII editing mode
					else if (isEditing && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
						e.preventDefault();
						if (!readOnly) {
							modifyByte(cursor, e.key.charCodeAt(0));
							if (cursor < data.length - 1) {
								setCursor(cursor + 1);
							}
						}
					}
					break;
				}
			}
		},
		[
			cursor,
			data.length,
			selection,
			isEditing,
			handleHexInput,
			modifyByte,
			readOnly,
		],
	);

	// Handle byte click
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
			setEditNibble("high");
			containerRef.current?.focus();
		},
		[cursor, selection],
	);

	// Scroll cursor into view
	useEffect(() => {
		const cursorRow = Math.floor(cursor / BYTES_PER_ROW);
		if (cursorRow < scrollOffset) {
			setScrollOffset(cursorRow);
		} else if (cursorRow >= scrollOffset + VISIBLE_ROWS - 2) {
			setScrollOffset(Math.max(0, cursorRow - VISIBLE_ROWS + 3));
		}
	}, [cursor, scrollOffset]);

	// Handle scroll
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

	// Goto offset
	const handleGoto = useCallback(() => {
		const offset = Number.parseInt(gotoValue, 16);
		if (!Number.isNaN(offset) && offset >= 0 && offset < data.length) {
			setCursor(offset);
			setSelection(null);
			setGotoValue("");
		}
	}, [gotoValue, data.length]);

	// Hotkeys
	useHotkeys([
		["mod+z", undo],
		["mod+shift+z", redo],
		["mod+y", redo],
		["mod+c", () => copyToClipboard()],
		["mod+v", () => pasteFromClipboard()],
		["mod+a", () => setSelection({ start: 0, end: data.length - 1 })],
		[
			"mod+g",
			() => {
				// Focus goto input - handled by component
			},
		],
	]);

	// Check if byte is in selection
	const isSelected = useCallback(
		(offset: number) => {
			const range = getSelectionRange();
			if (!range) return false;
			return offset >= range.start && offset <= range.end;
		},
		[getSelectionRange],
	);

	// Data inspection
	const inspections = useMemo(
		() => inspectData(data, cursor, littleEndian),
		[data, cursor, littleEndian],
	);

	// Render rows
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
				const isInSelection = isSelected(offset);

				// Group separator every 8 bytes
				if (col === 8) {
					hexCells.push(
						<span key={`sep-${row}`} className={styles.hexSeparator} />,
					);
				}

				hexCells.push(
					<span
						key={`hex-${offset}`}
						className={`${styles.hexByte} ${isCursor ? styles.cursor : ""} ${
							isInSelection ? styles.selected : ""
						} ${!isValidOffset ? styles.empty : ""}`}
						onClick={(e) => isValidOffset && handleByteClick(offset, e)}
						onKeyDown={() => {}}
						role="gridcell"
						tabIndex={-1}
						data-offset={offset}
					>
						{isValidOffset ? (
							<>
								<span
									className={
										isCursor && editNibble === "high" ? styles.editNibble : ""
									}
								>
									{byteToHex(byte)[0]}
								</span>
								<span
									className={
										isCursor && editNibble === "low" ? styles.editNibble : ""
									}
								>
									{byteToHex(byte)[1]}
								</span>
							</>
						) : (
							"  "
						)}
					</span>,
				);

				asciiCells.push(
					<span
						key={`ascii-${offset}`}
						className={`${styles.asciiByte} ${isCursor ? styles.cursor : ""} ${
							isInSelection ? styles.selected : ""
						} ${!isValidOffset ? styles.empty : ""} ${isPrintable(byte) ? "" : styles.nonPrintable}`}
						onClick={(e) => isValidOffset && handleByteClick(offset, e)}
						onKeyDown={() => {}}
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
	}, [
		data,
		startRow,
		endRow,
		cursor,
		editNibble,
		isSelected,
		handleByteClick,
	]);

	return (
		<Flex className={styles.hexEditor} h="100%">
			{/* Main editor area */}
			<Box
				className={styles.editorContainer}
				ref={containerRef}
				tabIndex={0}
				onKeyDown={handleKeyDown}
				onWheel={handleScroll}
				role="grid"
				aria-label="Hex Editor"
				style={{
					flex: 1,
					outline: "none",
				}}
			>
				{/* Toolbar */}
				<Group gap="xs" p="xs" className={styles.toolbar}>
					<Tooltip label="Undo (Ctrl+Z)">
						<ActionIcon
							variant="subtle"
							onClick={undo}
							disabled={historyIndex <= 0}
						>
							<Icon icon="rotate-ccw" width={16} height={16} title="Undo" />
						</ActionIcon>
					</Tooltip>
					<Tooltip label="Redo (Ctrl+Y)">
						<ActionIcon
							variant="subtle"
							onClick={redo}
							disabled={historyIndex >= history.length - 1}
						>
							<Icon icon="rotate-cw" width={16} height={16} title="Redo" />
						</ActionIcon>
					</Tooltip>
					<Divider orientation="vertical" />
					<Tooltip label="Copy (Ctrl+C)">
						<ActionIcon variant="subtle" onClick={() => copyToClipboard()}>
							<Icon icon="copy" width={16} height={16} title="Copy" />
						</ActionIcon>
					</Tooltip>
					<Tooltip label="Paste (Ctrl+V)">
						<ActionIcon
							variant="subtle"
							onClick={() => pasteFromClipboard()}
							disabled={readOnly}
						>
							<Icon icon="clipboard" width={16} height={16} title="Paste" />
						</ActionIcon>
					</Tooltip>
					<Divider orientation="vertical" />
					<TextInput
						size="xs"
						placeholder="Go to offset (hex)"
						value={gotoValue}
						onChange={(e) => setGotoValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleGoto();
							}
						}}
						rightSection={
							<ActionIcon variant="subtle" size="xs" onClick={handleGoto}>
								<Icon icon="arrow-right" width={14} height={14} title="Go" />
							</ActionIcon>
						}
						styles={{
							input: {
								fontFamily: "monospace",
								width: "120px",
							},
						}}
					/>
					<Divider orientation="vertical" />
					<Tooltip label="Toggle Edit Mode (Tab)">
						<ActionIcon
							variant={isEditing ? "filled" : "subtle"}
							size="xs"
							onClick={() => setIsEditing(!isEditing)}
						>
							<Text size="xs">{isEditing ? "ASCII" : "HEX"}</Text>
						</ActionIcon>
					</Tooltip>
					<Divider orientation="vertical" />
					<Text size="xs" c="dimmed">
						Offset: {cursor.toString(16).padStart(8, "0").toUpperCase()} | Size:{" "}
						{data.length.toLocaleString()} bytes
					</Text>
					{readOnly && (
						<Text size="xs" c="red" fw={500}>
							(Read Only)
						</Text>
					)}
				</Group>

				{/* Header */}
				<div className={styles.hexHeader}>
					<span className={styles.offset}>Offset</span>
					<span className={styles.hexCells}>
						{Array.from({ length: BYTES_PER_ROW }, (_, i) => {
							const elements: React.ReactNode[] = [];
							if (i === 8) {
								elements.push(
									<span key="header-sep" className={styles.hexSeparator} />,
								);
							}
							elements.push(
								<span
									key={`header-${i}`}
									className={`${styles.hexByte} ${styles.headerByte}`}
								>
									{i.toString(16).toUpperCase().padStart(2, "0")}
								</span>,
							);
							return elements;
						})}
					</span>
					<span className={styles.asciiCells}>
						<Text size="xs" c="dimmed">
							Decoded Text
						</Text>
					</span>
				</div>

				{/* Content */}
				<ScrollArea
					ref={scrollAreaRef}
					className={styles.scrollArea}
					type="scroll"
					offsetScrollbars
				>
					{data.length === 0 ? (
						<Box p="xl" ta="center">
							<Text c="dimmed" size="sm">
								No data to display. Open a binary file to start editing.
							</Text>
						</Box>
					) : (
						<div className={styles.hexContent}>{rows}</div>
					)}
				</ScrollArea>
			</Box>

			{/* Data Inspector Panel */}
			<Paper
				className={styles.inspector}
				withBorder
				p="xs"
				style={{
					width: "240px",
					overflowY: "auto",
				}}
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
								onClick={() => setLittleEndian(!littleEndian)}
							>
								<Text size="xs">{littleEndian ? "LE" : "BE"}</Text>
							</ActionIcon>
						</Tooltip>
					</Group>
					<Divider />
					<Text size="xs" c="dimmed">
						Offset: 0x{cursor.toString(16).toUpperCase()}
					</Text>
					<Table size="xs" verticalSpacing={2}>
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
											style={{
												wordBreak: "break-all",
											}}
										>
											{item.value}
										</Text>
									</Table.Td>
								</Table.Tr>
							))}
						</Table.Tbody>
					</Table>

					{selection && (
						<>
							<Divider />
							<Text size="xs" c="dimmed">
								Selection: 0x{Math.min(selection.start, selection.end).toString(16).toUpperCase()} - 0x{Math.max(selection.start, selection.end).toString(16).toUpperCase()} (
								{Math.abs(selection.end - selection.start) + 1} bytes)
							</Text>
						</>
					)}
				</Stack>
			</Paper>
		</Flex>
	);
}

import { Box, LoadingOverlay, Text } from "@mantine/core";
import Handsontable from "handsontable";
import Papa from "papaparse";
import { useEffect, useRef, useState } from "react";
import "handsontable/dist/handsontable.min.css";

import styles from "./styles.module.scss";

interface EditorSVProps {
	delimiter?: string;
	readOnly?: boolean;
	defaultValue?: string;
	onChange?: (content: string) => void;
}

const HOOKS_CHANGE = [
	"afterChange",
	"afterCreateRow",
	"afterCreateCol",
	"afterRemoveRow",
	"afterRemoveCol",
	"afterColumnMove",
	"afterRowMove",
	"afterColumnSort",
	"afterPaste",
	"afterCut",
	"afterUndo",
	"afterRedo",
	"afterMergeCells",
	"afterUnmergeCells",
] as const;

export default function EditorSV({
	delimiter,
	readOnly,
	defaultValue,
	onChange,
}: EditorSVProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const hotRef = useRef<Handsontable | null>(null);
	const propRef = useRef({
		delimiter: delimiter ?? ",",
		defaultValue: defaultValue ?? "",
		hasHeader: false,
	});
	const [status, setStatus] = useState<{
		status: "loading" | "ready" | "error";
		message?: string;
	}>({ status: "loading" });

	useEffect(() => {
		if (!containerRef.current) {
			return;
		}

		let parsed: string[][];
		try {
			const result = Papa.parse<string[]>(propRef.current.defaultValue, {
				delimiter: propRef.current.delimiter,
				skipEmptyLines: true,
			});
			parsed = result.data;
		} catch (e) {
			setStatus({
				status: "error",
				message: e instanceof Error ? e.message : "Failed to parse file",
			});
			return;
		}

		// Detect header row: must have 2+ rows, all first-row cells non-empty strings
		const hasHeader =
			parsed.length >= 2 &&
			parsed[0].every(
				(cell) => typeof cell === "string" && cell.trim().length > 0,
			);

		const colHeaders = hasHeader ? parsed[0] : true;
		const data = hasHeader ? parsed.slice(1) : parsed;
		propRef.current.hasHeader = hasHeader;

		let hot: Handsontable;
		try {
			hot = new Handsontable(containerRef.current, {
				data: data.length > 0 ? data.map((row) => [...row]) : [[""]],
				colHeaders,
				rowHeaders: true,
				stretchH: "all",

				// Sizing
				autoColumnSize: true,
				autoRowSize: true,

				// Navigation
				autoWrapCol: true,
				autoWrapRow: true,
				enterBeginsEditing: true,
				dragToScroll: true,
				outsideClickDeselects: false,

				// Selection
				selectionMode: "multiple",
				fragmentSelection: true,
				currentRowClassName: "currentRow",
				currentColClassName: "currentCol",
				activeHeaderClassName: "activeHeader",

				// Resize & reorder
				manualColumnResize: true,
				manualRowResize: true,
				manualColumnMove: true,
				manualRowMove: true,
				manualColumnFreeze: true,

				// Editing
				readOnly: true,
				contextMenu: true,
				comments: true,
				customBorders: true,
				copyPaste: true,
				fillHandle: true,
				mergeCells: true,
				allowEmpty: true,
				allowInsertColumn: true,
				allowInsertRow: true,
				allowRemoveColumn: true,
				allowRemoveRow: true,
				wordWrap: false,

				// Sorting & search
				columnSorting: true,
				search: true,

				// Rows/cols can be added via context menu
				minSpareRows: 0,
				minSpareCols: 0,

				// Undo/redo & state
				undo: true,
				persistentState: true,
			});
			hotRef.current = hot;
			setStatus({ status: "ready" });
		} catch (e) {
			setStatus({
				status: "error",
				message: e instanceof Error ? e.message : "Failed to initialize editor",
			});
			return;
		}

		return () => {
			if (hot && !hot.isDestroyed) {
				hot.destroy();
				hotRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		const hot = hotRef.current;
		if (hot && !hot.isDestroyed) {
			hot.updateSettings({ readOnly }, false);
		}
	}, [readOnly]);

	useEffect(() => {
		const hot = hotRef.current;

		const afterMutation = () => {
			const instance = hotRef.current;
			if (!instance) return;

			const tableData = instance.getData() as string[][];
			const headers = propRef.current.hasHeader
				? (instance.getColHeader() as string[])
				: null;
			const rows = headers ? [headers, ...tableData] : tableData;
			const csv = Papa.unparse(rows, {
				delimiter: propRef.current.delimiter,
			}) as string;

			onChange?.(csv);
		};

		if (hot && !hot.isDestroyed) {
			for (const hook of HOOKS_CHANGE) {
				hot.addHook(hook, afterMutation);
			}
		}
		return () => {
			if (hot && !hot.isDestroyed) {
				for (const hook of HOOKS_CHANGE) {
					hot.removeHook(hook, afterMutation);
				}
			}
		};
	}, [onChange]);

	return (
		<Box pos="relative" w="100%" h="100%">
			<LoadingOverlay
				visible={status.status !== "ready"}
				overlayProps={{ blur: 2 }}
				loaderProps={
					status.status === "error"
						? { children: <Text c="red">{status.message}</Text> }
						: { type: "dots", color: "gray", size: "xl" }
				}
			/>
			<div ref={containerRef} className={styles.container} />
		</Box>
	);
}

// PDF Viewer using pdf.js
// Renders PDF pages as canvas elements with a toolbar for navigation and zoom

import {
	ActionIcon,
	Box,
	Button,
	Center,
	Divider,
	Group,
	Loader,
	Menu,
	NumberInput,
	ScrollArea,
	Stack,
	Text,
	Tooltip,
} from "@mantine/core";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import Icon from "@/lib/ui/Icon";
import styles from "./styles.module.scss";

// Import pdf.js types
import type { PDFDocumentProxy as PDFDocType } from "pdfjs-dist";

// Lazy-loaded pdf.js module
let pdfjs: typeof import("pdfjs-dist") | null = null;

// Initialize pdf.js with worker
async function getPdfJs() {
	if (pdfjs) return pdfjs;

	// Dynamic import pdf.js
	const pdfjsModule = await import("pdfjs-dist");

	// Set up worker using Vite's module resolution
	// The `new URL(..., import.meta.url)` pattern is handled specially by Vite
	// and will bundle the worker file correctly
	if (!pdfjsModule.GlobalWorkerOptions.workerSrc) {
		const workerUrl = new URL(
			"pdfjs-dist/build/pdf.worker.min.mjs",
			import.meta.url
		);
		pdfjsModule.GlobalWorkerOptions.workerSrc = workerUrl.href;
	}

	pdfjs = pdfjsModule;
	return pdfjsModule;
}

// Types
type PDFDocumentProxy = PDFDocType;
type PDFPageProxy = Awaited<ReturnType<PDFDocumentProxy["getPage"]>>;

interface EditorPdfProps {
	/** PDF source - can be a URL, ArrayBuffer, or Uint8Array */
	src?: string | ArrayBuffer | Uint8Array;
	/** File name for display */
	fileName?: string;
}

// Zoom presets
const ZOOM_PRESETS = [
	{ value: 0.5, label: "50%" },
	{ value: 0.75, label: "75%" },
	{ value: 1, label: "100%" },
	{ value: 1.25, label: "125%" },
	{ value: 1.5, label: "150%" },
	{ value: 2, label: "200%" },
	{ value: 3, label: "300%" },
];

export default function EditorPdf({ src, fileName }: EditorPdfProps) {
	const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(0);
	const [scale, setScale] = useState(1);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [renderedPages, setRenderedPages] = useState<Map<number, boolean>>(new Map());

	const containerRef = useRef<HTMLDivElement>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
	const renderingRef = useRef<Set<number>>(new Set());

	// Load PDF document
	useEffect(() => {
		if (!src) {
			setError("No PDF source provided");
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setError(null);
		setPdfDoc(null);
		setRenderedPages(new Map());

		const loadPdf = async () => {
			try {
				// Get pdf.js module (initializes worker on first call)
				const pdfjsLib = await getPdfJs();

				// Prepare source data - create a copy to avoid detachment
				let loadingSource: Parameters<typeof pdfjsLib.getDocument>[0];

				if (typeof src === "string") {
					loadingSource = { url: src };
				} else {
					// Create a fresh copy of the data
					const sourceData = src instanceof ArrayBuffer
						? new Uint8Array(src)
						: src;
					const dataCopy = sourceData.slice();
					loadingSource = { data: dataCopy };
				}

				const pdf = await pdfjsLib.getDocument(loadingSource).promise;
				setPdfDoc(pdf);
				setTotalPages(pdf.numPages);
				setCurrentPage(1);
				setIsLoading(false);
			} catch (err) {
				console.error("Error loading PDF:", err);
				setError(err instanceof Error ? err.message : "Failed to load PDF");
				setIsLoading(false);
			}
		};

		loadPdf();

		return () => {
			// Cleanup
			if (pdfDoc) {
				pdfDoc.destroy();
			}
		};
	}, [src]);

	// Render a single page
	const renderPage = useCallback(async (pageNum: number, canvas: HTMLCanvasElement) => {
		if (!pdfDoc || renderingRef.current.has(pageNum)) return;

		renderingRef.current.add(pageNum);

		try {
			const page = await pdfDoc.getPage(pageNum);
			const viewport = page.getViewport({ scale });

			// Set canvas dimensions
			const outputScale = window.devicePixelRatio || 1;
			canvas.width = Math.floor(viewport.width * outputScale);
			canvas.height = Math.floor(viewport.height * outputScale);
			canvas.style.width = `${Math.floor(viewport.width)}px`;
			canvas.style.height = `${Math.floor(viewport.height)}px`;

			const context = canvas.getContext("2d");
			if (!context) return;

			context.scale(outputScale, outputScale);

			await page.render({
				canvasContext: context,
				viewport,
			}).promise;

			setRenderedPages(prev => new Map(prev).set(pageNum, true));
		} catch (err) {
			if ((err as Error).name !== "RenderingCancelledException") {
				console.error(`Error rendering page ${pageNum}:`, err);
			}
		} finally {
			renderingRef.current.delete(pageNum);
		}
	}, [pdfDoc, scale]);

	// Render visible pages when PDF is loaded or scale changes
	useEffect(() => {
		if (!pdfDoc) return;

		// Clear rendered pages when scale changes
		setRenderedPages(new Map());
		renderingRef.current.clear();

		// Render all pages (for simplicity; could optimize for large PDFs)
		const renderAllPages = async () => {
			for (let i = 1; i <= totalPages; i++) {
				const canvas = canvasRefs.current.get(i);
				if (canvas) {
					await renderPage(i, canvas);
				}
			}
		};

		// Small delay to ensure canvases are mounted
		const timer = setTimeout(renderAllPages, 100);
		return () => clearTimeout(timer);
	}, [pdfDoc, scale, totalPages, renderPage]);

	// Navigation
	const goToPage = useCallback((page: number) => {
		const newPage = Math.max(1, Math.min(page, totalPages));
		setCurrentPage(newPage);

		// Scroll to page
		const pageElement = document.getElementById(`pdf-page-${newPage}`);
		if (pageElement) {
			pageElement.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, [totalPages]);

	const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);
	const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);

	// Zoom
	const zoomIn = useCallback(() => {
		setScale(prev => Math.min(prev * 1.25, 5));
	}, []);

	const zoomOut = useCallback(() => {
		setScale(prev => Math.max(prev / 1.25, 0.25));
	}, []);

	// Track current page on scroll
	const handleScroll = useCallback(() => {
		if (!scrollAreaRef.current || totalPages === 0) return;

		const scrollArea = scrollAreaRef.current;
		const scrollTop = scrollArea.scrollTop;
		const scrollHeight = scrollArea.clientHeight;

		// Find which page is most visible
		for (let i = 1; i <= totalPages; i++) {
			const pageElement = document.getElementById(`pdf-page-${i}`);
			if (pageElement) {
				const rect = pageElement.getBoundingClientRect();
				const containerRect = scrollArea.getBoundingClientRect();

				if (rect.top <= containerRect.top + scrollHeight / 2 &&
					rect.bottom >= containerRect.top) {
					if (currentPage !== i) {
						setCurrentPage(i);
					}
					break;
				}
			}
		}
	}, [totalPages, currentPage]);

	// Download PDF
	const downloadPdf = useCallback(() => {
		if (!src) return;

		let blob: Blob;
		if (typeof src === "string") {
			// For URL sources, open in new tab
			window.open(src, "_blank");
			return;
		} else {
			const data = src instanceof ArrayBuffer ? new Uint8Array(src) : src;
			blob = new Blob([data], { type: "application/pdf" });
		}

		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = fileName || "document.pdf";
		a.click();
		URL.revokeObjectURL(url);
	}, [src, fileName]);

	// Loading state
	if (isLoading) {
		return (
			<Center h="100%" w="100%">
				<Stack align="center" gap="sm">
					<Loader size="xl" type="dots" color="gray" />
					<Text c="dimmed" size="sm">Loading PDF...</Text>
				</Stack>
			</Center>
		);
	}

	// Error state
	if (error || !pdfDoc) {
		return (
			<Center h="100%" w="100%">
				<Stack align="center" gap="md">
					<Icon icon="alert-circle" width={48} height={48} title="Error" />
					<Text c="dimmed">{error || "Failed to load PDF"}</Text>
					{src && (
						<Button variant="light" onClick={downloadPdf} leftSection={
							<Icon icon="download" width={16} height={16} title="Download" />
						}>
							Download PDF
						</Button>
					)}
				</Stack>
			</Center>
		);
	}

	return (
		<Box className={styles.pdfViewer} ref={containerRef}>
			{/* Toolbar */}
			<Group gap="xs" p="xs" className={styles.toolbar}>
				{/* Page Navigation */}
				<Tooltip label="Previous Page (←)">
					<ActionIcon variant="subtle" onClick={prevPage} disabled={currentPage <= 1}>
						<Icon icon="chevron-left" width={16} height={16} title="Previous" />
					</ActionIcon>
				</Tooltip>

				<Group gap={4}>
					<NumberInput
						size="xs"
						value={currentPage}
						onChange={(val) => goToPage(Number(val) || 1)}
						min={1}
						max={totalPages}
						hideControls
						styles={{ input: { width: 50, textAlign: "center" } }}
					/>
					<Text size="xs" c="dimmed">/ {totalPages}</Text>
				</Group>

				<Tooltip label="Next Page (→)">
					<ActionIcon variant="subtle" onClick={nextPage} disabled={currentPage >= totalPages}>
						<Icon icon="chevron-right" width={16} height={16} title="Next" />
					</ActionIcon>
				</Tooltip>

				<Divider orientation="vertical" />

				{/* Zoom Controls */}
				<Tooltip label="Zoom Out (-)">
					<ActionIcon variant="subtle" onClick={zoomOut} disabled={scale <= 0.25}>
						<Icon icon="zoom-out" width={16} height={16} title="Zoom Out" />
					</ActionIcon>
				</Tooltip>

				<Menu shadow="md" width={120}>
					<Menu.Target>
						<Button variant="subtle" size="xs" color="gray">
							{Math.round(scale * 100)}%
						</Button>
					</Menu.Target>
					<Menu.Dropdown>
						{ZOOM_PRESETS.map(preset => (
							<Menu.Item
								key={preset.value}
								onClick={() => setScale(preset.value)}
							>
								{preset.label}
							</Menu.Item>
						))}
					</Menu.Dropdown>
				</Menu>

				<Tooltip label="Zoom In (+)">
					<ActionIcon variant="subtle" onClick={zoomIn} disabled={scale >= 5}>
						<Icon icon="zoom-in" width={16} height={16} title="Zoom In" />
					</ActionIcon>
				</Tooltip>
				
				<Text size="xs" c="dimmed" ml="auto">
					{fileName || "PDF Document"}
				</Text>
			</Group>

			{/* PDF Pages */}
			<ScrollArea
				ref={scrollAreaRef}
				className={styles.scrollArea}
				onScrollPositionChange={handleScroll}
				type="scroll"
			>
				<Stack gap="md" p="md" align="center" className={styles.pagesContainer}>
					{Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
						<Box
							key={pageNum}
							id={`pdf-page-${pageNum}`}
							className={styles.pageWrapper}
						>
							<canvas
								ref={(el) => {
									if (el) canvasRefs.current.set(pageNum, el);
								}}
								className={styles.pageCanvas}
							/>
							{!renderedPages.get(pageNum) && (
								<Center className={styles.pageLoader}>
									<Loader size="sm" type="dots" />
								</Center>
							)}
						</Box>
					))}
				</Stack>
			</ScrollArea>
		</Box>
	);
}
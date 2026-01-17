// Image Editor using react-filerobot-image-editor
// https://github.com/scaleflex/filerobot-image-editor

import { Box, Center, Loader, Text } from "@mantine/core";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import styles from "./styles.module.scss";

// Lazy import types and components
type FilerobotImageEditorType = typeof import("react-filerobot-image-editor").default;
type TABSType = typeof import("react-filerobot-image-editor").TABS;
type TOOLSType = typeof import("react-filerobot-image-editor").TOOLS;

// Make React globally available for react-filerobot-image-editor
// This library requires React to be in global scope
const ensureReactGlobal = () => {
	if (typeof window !== "undefined") {
		// biome-ignore lint/suspicious/noExplicitAny: Required for library compatibility
		const win = window as any;
		if (!win.React) {
			win.React = React;
		}
		if (!win.ReactDOM) {
			win.ReactDOM = ReactDOM;
		}
	}
};

// Initialize immediately on module load
ensureReactGlobal();

interface EditorImageProps {
	/** Image source - can be a URL, data URL, or blob URL */
	src?: string;
	/** File name for saving */
	fileName?: string;
	/** Original file extension (e.g., 'jpg', 'png') to preserve format on save */
	fileExtension?: string;
	/** Called when image is saved/edited */
	onSave?: (imageData: {
		imageBase64: string;
		mimeType: string;
		width: number;
		height: number;
		fullName: string;
	}) => void;
	/** Called when editor is closed */
	onClose?: () => void;
	/** Read-only mode */
	readOnly?: boolean;
}

// Get save format from extension
function getSaveFormat(ext?: string): "jpeg" | "png" | "webp" {
	if (!ext) return "png";
	const lower = ext.toLowerCase();
	if (lower === "jpg" || lower === "jpeg") return "jpeg";
	if (lower === "webp") return "webp";
	if (lower === "png") return "png";
	// For other formats (gif, bmp, tiff, etc.), save as PNG to preserve quality
	return "png";
}

// Get mime type from format
function formatToMimeType(format: "jpeg" | "png" | "webp"): string {
	switch (format) {
		case "jpeg": return "image/jpeg";
		case "webp": return "image/webp";
		default: return "image/png";
	}
}

export default function EditorImage({
	src,
	fileName = "image",
	fileExtension,
	onSave,
	onClose,
	readOnly = false,
}: EditorImageProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [EditorComponent, setEditorComponent] = useState<{
		Editor: FilerobotImageEditorType;
		TABS: TABSType;
		TOOLS: TOOLSType;
	} | null>(null);
	
	// Store onSave in ref to use in callbacks without stale closures
	const onSaveRef = useRef(onSave);
	onSaveRef.current = onSave;
	
	// Determine save format
	const saveFormat = getSaveFormat(fileExtension);

	// Dynamically import the editor component
	useEffect(() => {
		ensureReactGlobal();

		import("react-filerobot-image-editor")
			.then((module) => {
				setEditorComponent({
					Editor: module.default,
					TABS: module.TABS,
					TOOLS: module.TOOLS,
				});
			})
			.catch((err) => {
				console.error("Failed to load image editor:", err);
				setError("Failed to load image editor");
			});
	}, []);

	// Handle before save - intercept and save directly without modal
	const handleBeforeSave = useCallback(
		(savedImageData: {
			name: string;
			extension: string;
			mimeType: string;
			fullName?: string;
			height?: number;
			width?: number;
			imageCanvas?: HTMLCanvasElement;
			imageBase64?: string;
			quality?: number;
			cloudimageUrl?: string;
		}) => {
			if (readOnly) return false;
			
			// Get the canvas and convert to base64 with the correct format
			const canvas = savedImageData.imageCanvas;
			if (canvas) {
				const mimeType = formatToMimeType(saveFormat);
				const quality = saveFormat === "jpeg" ? 0.92 : undefined;
				const imageBase64 = canvas.toDataURL(mimeType, quality);
				
				onSaveRef.current?.({
					imageBase64,
					mimeType,
					width: canvas.width,
					height: canvas.height,
					fullName: savedImageData.fullName || fileName,
				});
			}
			
			// Return false to prevent the default save dialog
			return false;
		},
		[readOnly, saveFormat, fileName],
	);

	// Handle save (called after the save dialog, but we skip it with onBeforeSave)
	const handleSave = useCallback(
		(editedImageObject: {
			name: string;
			fullName: string;
			extension: string;
			mimeType: string;
			imageBase64: string;
			width: number;
			height: number;
			quality?: number;
		}) => {
			if (readOnly) return;

			onSaveRef.current?.({
				imageBase64: editedImageObject.imageBase64,
				mimeType: editedImageObject.mimeType,
				width: editedImageObject.width,
				height: editedImageObject.height,
				fullName: editedImageObject.fullName,
			});
		},
		[readOnly],
	);

	// Handle close
	const handleClose = useCallback(() => {
		onClose?.();
	}, [onClose]);

	// Handle load error
	useEffect(() => {
		if (!src) {
			setError("No image source provided");
			setIsLoading(false);
			return;
		}

		const img = new Image();
		img.onload = () => {
			setIsLoading(false);
			setError(null);
		};
		img.onerror = () => {
			setIsLoading(false);
			setError("Failed to load image");
		};
		img.src = src;
	}, [src]);

	if (isLoading || !EditorComponent) {
		return (
			<Center h="100%" w="100%">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}

	if (error || !src) {
		return (
			<Center h="100%" w="100%">
				<Text c="dimmed">{error || "No image to display"}</Text>
			</Center>
		);
	}

	const { Editor, TABS, TOOLS } = EditorComponent;

	// Configure available tabs based on read-only mode
	const tabsConfig = readOnly
		? [TABS.ADJUST]
		: [
				TABS.ADJUST,
				TABS.ANNOTATE,
				TABS.FILTERS,
				TABS.FINETUNE,
				TABS.RESIZE,
				TABS.WATERMARK,
			];

	// Configure available annotation tools
	const annotationsConfig = readOnly
		? []
		: [
				TOOLS.TEXT,
				TOOLS.PEN,
				TOOLS.ARROW,
				TOOLS.LINE,
				TOOLS.RECT,
				TOOLS.ELLIPSE,
				TOOLS.POLYGON,
			];

	return (
		<Box className={styles.imageEditor} h="100%" w="100%">
			<Editor
				source={src}
				onBeforeSave={handleBeforeSave}
				onSave={handleSave}
				onClose={handleClose}
				annotationsCommon={{
					fill: "#ff0000",
				}}
				Annotate={{
					tools: annotationsConfig,
				}}
				Text={{ text: "Text" }}
				tabsIds={tabsConfig}
				defaultTabId={TABS.ADJUST}
				defaultToolId={TOOLS.CROP}
				Rotate={{ angle: 90, componentType: "slider" }}
				Crop={{
					presetsItems: [
						{
							titleKey: "classicTv",
							descriptionKey: "4:3",
							ratio: 4 / 3,
						},
						{
							titleKey: "cinemascope",
							descriptionKey: "16:9",
							ratio: 16 / 9,
						},
						{
							titleKey: "square",
							descriptionKey: "1:1",
							ratio: 1,
						},
					],
					presetsFolders: [
						{
							titleKey: "socialMedia",
							groups: [
								{
									titleKey: "facebook",
									items: [
										{
											titleKey: "cover",
											descriptionKey: "820x312",
											width: 820,
											height: 312,
										},
										{
											titleKey: "profile",
											descriptionKey: "170x170",
											width: 170,
											height: 170,
										},
									],
								},
								{
									titleKey: "instagram",
									items: [
										{
											titleKey: "post",
											descriptionKey: "1080x1080",
											width: 1080,
											height: 1080,
										},
										{
											titleKey: "story",
											descriptionKey: "1080x1920",
											width: 1080,
											height: 1920,
										},
									],
								},
							],
						},
					],
				}}
				defaultSavedImageName={fileName}
				defaultSavedImageType={saveFormat}
				forceToPngInEllipticalCrop={false}
				savingPixelRatio={1}
				previewPixelRatio={1}
				observePluginContainerSize
				showCanvasOnly={false}
				useCloudimage={false}
			/>
		</Box>
	);
}

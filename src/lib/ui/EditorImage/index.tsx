// Image Editor using react-filerobot-image-editor
// https://github.com/scaleflex/filerobot-image-editor

import { Box, Center, Loader, Text } from "@mantine/core";
import React, { useCallback, useEffect, useState } from "react";
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

export default function EditorImage({
	src,
	fileName = "image",
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

	// Dynamically import the editor component
	useEffect(() => {
		// Ensure React is globally available before loading the editor
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

	// Handle save from the editor
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

			onSave?.({
				imageBase64: editedImageObject.imageBase64,
				mimeType: editedImageObject.mimeType,
				width: editedImageObject.width,
				height: editedImageObject.height,
				fullName: editedImageObject.fullName,
			});
		},
		[onSave, readOnly],
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

		// Test if image can be loaded
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
				savingPixelRatio={2}
				previewPixelRatio={2}
				observePluginContainerSize
				showCanvasOnly={false}
				useCloudimage={false}
			/>
		</Box>
	);
}

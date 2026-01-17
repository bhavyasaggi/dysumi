// Media Viewer - Audio/Video player using native HTML5 elements
// Supports: mp3, mp4, webm, wav, ogg, m4a, flac, aac, mkv, avi, mov, etc.

import {
	ActionIcon,
	Box,
	Center,
	Group,
	Loader,
	Paper,
	Slider,
	Stack,
	Text,
	Tooltip,
} from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/lib/ui/Icon";
import styles from "./styles.module.scss";

interface ViewerMediaProps {
	/** Media source - URL or blob URL */
	src?: string;
	/** File name for display */
	fileName?: string;
	/** Media type - 'audio' or 'video', auto-detected if not provided */
	type?: "audio" | "video";
	/** MIME type */
	mimeType?: string;
}

// Format time in MM:SS or HH:MM:SS
function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds)) return "0:00";

	const hrs = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hrs > 0) {
		return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Detect media type from file extension
function detectMediaType(fileName: string): "audio" | "video" {
	const ext = fileName.split(".").pop()?.toLowerCase() || "";
	const audioExtensions = new Set([
		"mp3", "wav", "ogg", "m4a", "flac", "aac", "wma", "aiff", "opus",
	]);
	return audioExtensions.has(ext) ? "audio" : "video";
}

export default function ViewerMedia({
	src,
	fileName = "media",
	type,
	mimeType,
}: ViewerMediaProps) {
	const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const [isMuted, setIsMuted] = useState(false);
	const [playbackRate, setPlaybackRate] = useState(1);
	const [isFullscreen, setIsFullscreen] = useState(false);

	// Determine media type
	const mediaType = type || detectMediaType(fileName);
	const isVideo = mediaType === "video";

	// Handle media events
	const handleLoadedMetadata = useCallback(() => {
		if (mediaRef.current) {
			setDuration(mediaRef.current.duration);
			setIsLoading(false);
		}
	}, []);

	const handleTimeUpdate = useCallback(() => {
		if (mediaRef.current) {
			setCurrentTime(mediaRef.current.currentTime);
		}
	}, []);

	const handleEnded = useCallback(() => {
		setIsPlaying(false);
	}, []);

	const handleError = useCallback(() => {
		setError("Failed to load media file");
		setIsLoading(false);
	}, []);

	const handleCanPlay = useCallback(() => {
		setIsLoading(false);
	}, []);

	// Playback controls
	const togglePlay = useCallback(() => {
		if (!mediaRef.current) return;

		if (isPlaying) {
			mediaRef.current.pause();
		} else {
			mediaRef.current.play();
		}
		setIsPlaying(!isPlaying);
	}, [isPlaying]);

	const handleSeek = useCallback((value: number) => {
		if (!mediaRef.current) return;
		mediaRef.current.currentTime = value;
		setCurrentTime(value);
	}, []);

	const handleVolumeChange = useCallback((value: number) => {
		if (!mediaRef.current) return;
		mediaRef.current.volume = value;
		setVolume(value);
		setIsMuted(value === 0);
	}, []);

	const toggleMute = useCallback(() => {
		if (!mediaRef.current) return;
		const newMuted = !isMuted;
		mediaRef.current.muted = newMuted;
		setIsMuted(newMuted);
	}, [isMuted]);

	const handlePlaybackRateChange = useCallback((rate: number) => {
		if (!mediaRef.current) return;
		mediaRef.current.playbackRate = rate;
		setPlaybackRate(rate);
	}, []);

	const skip = useCallback((seconds: number) => {
		if (!mediaRef.current) return;
		const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
		mediaRef.current.currentTime = newTime;
		setCurrentTime(newTime);
	}, [currentTime, duration]);

	const toggleFullscreen = useCallback(() => {
		const container = mediaRef.current?.parentElement?.parentElement;
		if (!container) return;

		if (!document.fullscreenElement) {
			container.requestFullscreen();
			setIsFullscreen(true);
		} else {
			document.exitFullscreen();
			setIsFullscreen(false);
		}
	}, []);

	// Handle fullscreen changes
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};

		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () => {
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
		};
	}, []);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Only handle if not in an input field
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			switch (e.key) {
				case " ":
				case "k":
					e.preventDefault();
					togglePlay();
					break;
				case "ArrowLeft":
					e.preventDefault();
					skip(-5);
					break;
				case "ArrowRight":
					e.preventDefault();
					skip(5);
					break;
				case "ArrowUp":
					e.preventDefault();
					handleVolumeChange(Math.min(1, volume + 0.1));
					break;
				case "ArrowDown":
					e.preventDefault();
					handleVolumeChange(Math.max(0, volume - 0.1));
					break;
				case "m":
					e.preventDefault();
					toggleMute();
					break;
				case "f":
					if (isVideo) {
						e.preventDefault();
						toggleFullscreen();
					}
					break;
				case "j":
					e.preventDefault();
					skip(-10);
					break;
				case "l":
					e.preventDefault();
					skip(10);
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [togglePlay, skip, handleVolumeChange, toggleMute, toggleFullscreen, volume, isVideo]);

	// Loading state
	if (!src) {
		return (
			<Center h="100%" w="100%">
				<Text c="dimmed">No media source provided</Text>
			</Center>
		);
	}

	// Error state
	if (error) {
		return (
			<Center h="100%" w="100%">
				<Stack align="center" gap="sm">
					<Icon icon="alert-circle" width={48} height={48} title="Error" />
					<Text c="dimmed">{error}</Text>
				</Stack>
			</Center>
		);
	}

	return (
		<Box className={styles.mediaViewer}>
			{/* Media Container */}
			<Box className={styles.mediaContainer}>
				{isVideo ? (
					<video
						ref={mediaRef as React.RefObject<HTMLVideoElement>}
						src={src}
						className={styles.video}
						onLoadedMetadata={handleLoadedMetadata}
						onTimeUpdate={handleTimeUpdate}
						onEnded={handleEnded}
						onError={handleError}
						onCanPlay={handleCanPlay}
						onPlay={() => setIsPlaying(true)}
						onPause={() => setIsPlaying(false)}
						onClick={togglePlay}
						playsInline
					/>
				) : (
					<Box className={styles.audioContainer}>
						<audio
							ref={mediaRef as React.RefObject<HTMLAudioElement>}
							src={src}
							onLoadedMetadata={handleLoadedMetadata}
							onTimeUpdate={handleTimeUpdate}
							onEnded={handleEnded}
							onError={handleError}
							onCanPlay={handleCanPlay}
							onPlay={() => setIsPlaying(true)}
							onPause={() => setIsPlaying(false)}
						/>
						{/* Audio visualization placeholder */}
						<Center className={styles.audioVisual}>
							<Stack align="center" gap="md">
								<Icon
									icon={isPlaying ? "volume-2" : "music"}
									width={64}
									height={64}
									title="Audio"
								/>
								<Text size="lg" fw={500}>
									{fileName}
								</Text>
							</Stack>
						</Center>
					</Box>
				)}

				{/* Loading overlay */}
				{isLoading && (
					<Center className={styles.loadingOverlay}>
						<Loader size="xl" type="dots" color="white" />
					</Center>
				)}
			</Box>

			{/* Controls */}
			<Paper className={styles.controls} p="xs">
				{/* Progress bar */}
				<Slider
					className={styles.progressBar}
					value={currentTime}
					onChange={handleSeek}
					min={0}
					max={duration || 100}
					step={0.1}
					size="sm"
					label={(value) => formatTime(value)}
					styles={{
						track: { cursor: "pointer" },
						thumb: { cursor: "pointer" },
					}}
				/>

				{/* Control buttons */}
				<Group justify="space-between" mt="xs">
					<Group gap="xs">
						{/* Play/Pause */}
						<Tooltip label={isPlaying ? "Pause (Space)" : "Play (Space)"}>
							<ActionIcon
								variant="subtle"
								size="lg"
								onClick={togglePlay}
							>
								<Icon
									icon={isPlaying ? "pause" : "play"}
									width={20}
									height={20}
									title={isPlaying ? "Pause" : "Play"}
								/>
							</ActionIcon>
						</Tooltip>

						{/* Skip backward */}
						<Tooltip label="Back 10s (J)">
							<ActionIcon variant="subtle" onClick={() => skip(-10)}>
								<Icon icon="skip-back" width={16} height={16} title="Skip Back" />
							</ActionIcon>
						</Tooltip>

						{/* Skip forward */}
						<Tooltip label="Forward 10s (L)">
							<ActionIcon variant="subtle" onClick={() => skip(10)}>
								<Icon icon="skip-forward" width={16} height={16} title="Skip Forward" />
							</ActionIcon>
						</Tooltip>

						{/* Volume */}
						<Group gap={4}>
							<Tooltip label={isMuted ? "Unmute (M)" : "Mute (M)"}>
								<ActionIcon variant="subtle" onClick={toggleMute}>
									<Icon
										icon={isMuted ? "volume-x" : volume > 0.5 ? "volume-2" : "volume-1"}
										width={16}
										height={16}
										title="Volume"
									/>
								</ActionIcon>
							</Tooltip>
							<Slider
								className={styles.volumeSlider}
								value={isMuted ? 0 : volume}
								onChange={handleVolumeChange}
								min={0}
								max={1}
								step={0.01}
								size="xs"
								w={80}
							/>
						</Group>

						{/* Time display */}
						<Text size="xs" c="dimmed" ff="monospace">
							{formatTime(currentTime)} / {formatTime(duration)}
						</Text>
					</Group>

					<Group gap="xs">
						{/* Playback speed */}
						<Tooltip label="Playback Speed">
							<ActionIcon
								variant="subtle"
								onClick={() => {
									const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
									const currentIndex = rates.indexOf(playbackRate);
									const nextIndex = (currentIndex + 1) % rates.length;
									handlePlaybackRateChange(rates[nextIndex]);
								}}
							>
								<Text size="xs" fw={500}>{playbackRate}x</Text>
							</ActionIcon>
						</Tooltip>

						{/* Fullscreen (video only) */}
						{isVideo && (
							<Tooltip label={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}>
								<ActionIcon variant="subtle" onClick={toggleFullscreen}>
									<Icon
										icon={isFullscreen ? "minimize" : "maximize"}
										width={16}
										height={16}
										title="Fullscreen"
									/>
								</ActionIcon>
							</Tooltip>
						)}

						{/* File name */}
						<Text size="xs" c="dimmed" maw={200} truncate>
							{fileName}
						</Text>
					</Group>
				</Group>
			</Paper>
		</Box>
	);
}
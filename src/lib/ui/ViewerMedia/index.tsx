import "@videojs/react/video/skin.css";

import { Audio } from "@videojs/react/audio";
import { Video, VideoPlayer, VideoSkin } from "@videojs/react/video";
import type React from "react";
import { useCallback, useState } from "react";
import MidiPlayer from "./Midi";
import styles from "./styles.module.scss";
import AudioVisualizer from "./Visualizer";

const skinStyle = {
	width: "100%",
	height: "100%",
	"--media-border-radius": "0px",
} as React.CSSProperties;

type MediaKind = "audio" | "video" | "midi";
type MediaRef = React.Ref<HTMLAudioElement | HTMLVideoElement> | undefined;

function assignRef(
	ref: MediaRef,
	node: HTMLAudioElement | HTMLVideoElement | null,
) {
	if (typeof ref === "function") ref(node);
	else if (ref) ref.current = node;
}

function MediaStage({
	kind,
	src,
	media,
	onAudio,
	onVideo,
}: {
	kind: MediaKind;
	src: string;
	media: HTMLMediaElement | null;
	onAudio: (node: HTMLAudioElement | null) => void;
	onVideo: (node: HTMLVideoElement | null) => void;
}) {
	if (kind === "audio") {
		return (
			<div className={styles.stage}>
				<AudioVisualizer media={media} />
				<Audio ref={onAudio} src={src} className={styles.audio} />
			</div>
		);
	}
	return <Video ref={onVideo} src={src} playsInline />;
}

// One player chrome for both kinds. Video fills the stage with the picture.
// Audio fills the same stage with the visualizer and keeps the same controls.
export default function ViewerMedia({
	ref,
	src,
	bytes,
	type = "video",
}: {
	ref?: MediaRef;
	src?: string;
	bytes?: Uint8Array;
	type?: MediaKind;
}) {
	const [media, setMedia] = useState<HTMLMediaElement | null>(null);
	const onAudio = useCallback(
		(node: HTMLAudioElement | null) => {
			setMedia(node);
			assignRef(ref, node);
		},
		[ref],
	);
	const onVideo = useCallback(
		(node: HTMLVideoElement | null) => {
			setMedia(node);
			assignRef(ref, node);
		},
		[ref],
	);

	if (type === "midi" && bytes) {
		return (
			<div className={styles.shell}>
				<MidiPlayer bytes={bytes} />
			</div>
		);
	}

	return (
		<div className={styles.shell}>
			<VideoPlayer>
				<VideoSkin className={styles.skin} style={skinStyle}>
					<MediaStage
						kind={type === "audio" ? "audio" : "video"}
						src={src ?? ""}
						media={media}
						onAudio={onAudio}
						onVideo={onVideo}
					/>
				</VideoSkin>
			</VideoPlayer>
		</div>
	);
}

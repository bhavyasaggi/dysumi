import "@videojs/react/video/minimal-skin.css";

import { createPlayer, videoFeatures } from "@videojs/react";
import { MinimalVideoSkin, Video } from "@videojs/react/video";
import type React from "react";

const Player = createPlayer({ features: videoFeatures });

// TODO: Include butterchurn visualizer
export default function ViewerMedia({
	ref,
	...props
}: {
	ref?: React.Ref<HTMLVideoElement>;
	src: string;
	type?: "audio" | "video";
}) {
	return (
		<Player.Provider>
			<MinimalVideoSkin
				style={{ "--media-border-radius": "0px" } as React.CSSProperties}
			>
				<Video ref={ref} src={props.src} playsInline />
			</MinimalVideoSkin>
		</Player.Provider>
	);
}

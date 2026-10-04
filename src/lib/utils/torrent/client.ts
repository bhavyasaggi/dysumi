import type WebTorrent from "webtorrent";
import type { Torrent } from "webtorrent";
import WebTorrentClient from "webtorrent/dist/webtorrent.min.js";

// WebSocket trackers shipped by create-torrent. instant.io announces to these
// so a browser can find WebRTC peers.
export const WEB_TRACKERS = [
	"wss://tracker.btorrent.xyz",
	"wss://tracker.openwebtorrent.com",
	"wss://tracker.webtorrent.dev",
];

let client: WebTorrent | null = null;

export function webrtcSupported(): boolean {
	return WebTorrentClient.WEBRTC_SUPPORT;
}

function torrentClient(): WebTorrent {
	if (!client || client.destroyed) {
		client = new WebTorrentClient({
			dht: false,
			lsd: false,
			utPex: false,
			natUpnp: false,
			natPmp: false,
			tracker: { announce: WEB_TRACKERS },
		});
		client.on("error", () => {
			// Each torrent reports its own error to the viewer.
		});
	}
	return client;
}

export function addTorrentFile(bytes: Uint8Array): Torrent {
	return torrentClient().add(bytes);
}

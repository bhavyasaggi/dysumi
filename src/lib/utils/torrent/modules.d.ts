declare module "parse-torrent" {
	export interface ParsedTorrentFile {
		name: string;
		path: string;
		length: number;
		offset: number;
	}

	export interface ParsedTorrent {
		name?: string;
		infoHash?: string;
		announce?: string[];
		urlList?: string[];
		comment?: string;
		created?: Date;
		createdBy?: string;
		private?: boolean;
		files?: ParsedTorrentFile[];
		length?: number;
		pieceLength?: number;
	}

	export function toMagnetURI(parsed: ParsedTorrent): string;

	export default function parseTorrent(
		input: Uint8Array,
	): Promise<ParsedTorrent>;
}

declare module "webtorrent/dist/webtorrent.min.js" {
	import type WebTorrent from "webtorrent";

	const Client: typeof WebTorrent;
	export default Client;
}

import parseTorrent, { type ParsedTorrent, toMagnetURI } from "parse-torrent";

export interface TorrentFileMeta {
	name: string;
	path: string;
	length: number;
}

export interface TorrentMeta {
	name: string;
	infoHash: string;
	announce: string[];
	urlList: string[];
	comment: string;
	created: Date | null;
	createdBy: string;
	private: boolean;
	files: TorrentFileMeta[];
	length: number;
	pieceLength: number;
	magnet: string;
}

function asFiles(parsed: ParsedTorrent, name: string): TorrentFileMeta[] {
	const files = parsed.files ?? [];
	if (files.length === 0) {
		return [{ name, path: name, length: parsed.length ?? 0 }];
	}
	return files.map((file) => ({
		name: file.name || name,
		path: file.path || file.name || name,
		length: file.length,
	}));
}

export async function readTorrentMeta(bytes: Uint8Array): Promise<TorrentMeta> {
	if (bytes.byteLength === 0) throw new Error("The file is empty");
	let parsed: ParsedTorrent;
	try {
		parsed = await parseTorrent(bytes);
	} catch {
		throw new Error("This file is not a valid torrent");
	}
	const infoHash = parsed.infoHash ?? "";
	const name = parsed.name ?? "";
	if (!(infoHash && name)) throw new Error("This file is not a valid torrent");
	const files = asFiles(parsed, name);
	const length =
		parsed.length ?? files.reduce((sum, file) => sum + file.length, 0);
	let magnet = `magnet:?xt=urn:btih:${infoHash}`;
	try {
		magnet = toMagnetURI(parsed);
	} catch {
		magnet = `magnet:?xt=urn:btih:${infoHash}`;
	}
	return {
		name,
		infoHash,
		announce: parsed.announce ?? [],
		urlList: parsed.urlList ?? [],
		comment: parsed.comment ?? "",
		created: parsed.created ?? null,
		createdBy: parsed.createdBy ?? "",
		private: Boolean(parsed.private),
		files,
		length,
		pieceLength: parsed.pieceLength ?? 0,
		magnet,
	};
}

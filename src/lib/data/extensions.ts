// Binary/hex file extensions that should use the hex editor
export const HEX_EXTENSIONS = new Set([
	"bin",
	"dat",
	"exe",
	"dll",
	"so",
	"dylib",
	"o",
	"obj",
	"a",
	"lib",
	"rom",
	"iso",
	"raw",
	"hex",
	"dmp",
	"core",
]);

// Image file extensions supported by the image editor
export const IMAGE_EXTENSIONS = new Set([
	"jpg",
	"jpeg",
	"png",
	"gif",
	"webp",
	"ico",
	"tiff",
	"tif",
	"bmp",
	"avif",
	"heic",
	"heif",
]);

// Markdown file extensions
export const MARKDOWN_EXTENSIONS = new Set(["md", "mdx"]);

// PDF file extension
export const PDF_EXTENSIONS = new Set(["pdf"]);

// Video file extensions
export const VIDEO_EXTENSIONS = new Set([
	"mp4",
	"webm",
	"ogg",
	"ogv",
	"mov",
	"avi",
	"mkv",
	"m4v",
	"3gp",
	"wmv",
	"flv",
]);

// Audio file extensions
export const AUDIO_EXTENSIONS = new Set([
	"mp3",
	"wav",
	"m4a",
	"aac",
	"flac",
	"wma",
	"aiff",
	"opus",
	"oga",
	"ogg",
]);

// Calendar file extensions (iCalendar and vCalendar)
export const CALENDAR_EXTENSIONS = new Set([
	"ics", // iCalendar format
	"vcs", // vCalendar format (legacy)
	"ical",
	"ifb", // Free/Busy data
]);

// EPub file extensions
export const EPUB_EXTENSIONS = new Set(["epub"]);

// LaTeX/TeX file extensions
export const TEX_EXTENSIONS = new Set(["tex", "latex", "ltx"]);

// Tabular file extensions
export const TABULAR_EXTENSIONS = new Set(["csv", "tsv", "psv"]);

// HTTP/REST file extensions
export const REST_EXTENSIONS = new Set(["http", "rest", "curl"]);

// GraphQL file extensions
export const GRAPHQL_EXTENSIONS = new Set(["graphql", "gql"]);

// KML, KMZ, and Garmin TCX geographic file extensions
export const KML_EXTENSIONS = new Set(["kml", "kmz", "tcx", "geojson"]);

// HAR (HTTP Archive) file extensions
export const HAR_EXTENSIONS = new Set(["har"]);

// OFX, QFX, and QIF financial statements
export const FINANCE_EXTENSIONS = new Set(["ofx", "qfx", "qif"]);

// Excalidraw scene files
export const EXCALIDRAW_EXTENSIONS = new Set(["excalidraw"]);

// UNIX mbox mailboxes and single RFC 822 messages
export const MAIL_EXTENSIONS = new Set(["mbox", "eml"]);

// Mermaid diagram source
export const MERMAID_EXTENSIONS = new Set(["mermaid", "mmd"]);

// SVG files open in the local SVGO optimizer
export const SVG_EXTENSIONS = new Set(["svg"]);

// JWT, JWK, JWKS, JWE, and OpenID discovery files
export const JOSE_EXTENSIONS = new Set([
	"jwt",
	"jws",
	"jwe",
	"jwk",
	"jwks",
	"well-known",
]);

// BitTorrent metainfo files
export const TORRENT_EXTENSIONS = new Set(["torrent"]);

// Flutter ARB, gettext, XLIFF, and Apple strings catalogs
export const CATALOG_EXTENSIONS = new Set([
	"arb",
	"po",
	"pot",
	"xlf",
	"xliff",
	"xlif",
	"strings",
]);

// vCard address books
export const VCARD_EXTENSIONS = new Set(["vcf"]);

// FictionBook 2
export const FB2_EXTENSIONS = new Set(["fb2"]);

// DjVu documents
export const DJVU_EXTENSIONS = new Set(["djvu"]);

// Compiled HTML Help
export const CHM_EXTENSIONS = new Set(["chm"]);

// Standard MIDI files. Browsers cannot decode these in an audio element.
export const MIDI_EXTENSIONS = new Set(["mid", "midi"]);

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
	"svg",
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
export const REST_EXTENSIONS = new Set(["http", "rest"]);

// GraphQL file extensions
export const GRAPHQL_EXTENSIONS = new Set(["graphql", "gql"]);

// KML/KMZ geographic file extensions
export const KML_EXTENSIONS = new Set(["kml", "kmz"]);

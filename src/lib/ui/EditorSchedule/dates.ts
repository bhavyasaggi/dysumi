import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

// Mantine schedule and date pickers speak in these strings, parsed as local time.
const SCHEDULE_FORMATS = [
	"YYYY-MM-DD HH:mm:ss",
	"YYYY-MM-DD HH:mm",
	"YYYY-MM-DD",
];

export function parseScheduleDate(
	value: string | Date | null | undefined,
): Date | undefined {
	if (!value) return undefined;
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? undefined : value;
	}
	const parsed = dayjs(value, SCHEDULE_FORMATS, true);
	if (parsed.isValid()) return parsed.toDate();
	const fallback = new Date(value);
	return Number.isNaN(fallback.getTime()) ? undefined : fallback;
}

export function formatScheduleDate(date: Date): string {
	return dayjs(date).format("YYYY-MM-DD HH:mm:ss");
}

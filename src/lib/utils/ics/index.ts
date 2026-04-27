import ICAL from "ical.js";

import { buildRRuleString } from "./helpers";
import { parseVEvent } from "./parseVEvent";
import { parseVJournal } from "./parseVJournal";
import { parseVTodo } from "./parseVTodo";

import type { CalendarData, CalendarEvent } from "./types";

// ─── VCS (vCalendar 1.0) → iCalendar 2.0 normalizer ────────────────────────
// vCalendar 1.0 (.vcs) uses VERSION:1.0, quoted-printable encoding, and some
// different property names. ical.js only parses iCalendar 2.0, so we
// pre-process VCS content to make it parseable.

/**
 * Detect whether content is vCalendar 1.0 format.
 */
function isVCalendar1(content: string): boolean {
	return /VERSION\s*:\s*1\.0/i.test(content);
}

/**
 * Decode a quoted-printable encoded string (used in VCS 1.0).
 * Handles soft line breaks (=\r\n or =\n) and =XX hex escapes.
 */
function decodeQuotedPrintable(str: string): string {
	// Join soft line breaks
	const joined = str.replace(/=\r?\n/g, "");
	// Decode =XX hex sequences
	return joined.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
		String.fromCharCode(Number.parseInt(hex, 16)),
	);
}

/**
 * Normalize vCalendar 1.0 content to iCalendar 2.0.
 *
 * Key differences handled:
 * - VERSION:1.0 → VERSION:2.0
 * - DCREATED → CREATED
 * - DAYLIGHT / TZ properties → stripped (no direct iCal 2.0 equivalent)
 * - Quoted-printable encoding → decoded to plain UTF-8
 * - ENCODING=QUOTED-PRINTABLE;CHARSET=UTF-8 parameters → stripped
 * - AALARM / DALARM → VALARM subcomponent (best-effort)
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: VCS format normalization requires many conditional branches
function normalizeVcs(content: string): string {
	const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
	const output: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];

		// Upgrade version
		if (/^VERSION\s*:\s*1\.0$/i.test(line)) {
			output.push("VERSION:2.0");
			continue;
		}

		// Strip VCS-only timezone properties
		if (/^(TZ|DAYLIGHT)\s*:/i.test(line)) {
			continue;
		}

		// Rename DCREATED → CREATED
		if (/^DCREATED\s*[;:]/i.test(line)) {
			line = line.replace(/^DCREATED/i, "CREATED");
		}

		// Handle quoted-printable encoded properties
		// e.g. DESCRIPTION;ENCODING=QUOTED-PRINTABLE;CHARSET=UTF-8:some=20text
		if (/ENCODING\s*=\s*QUOTED-PRINTABLE/i.test(line)) {
			// Collect continuation lines (ending with =)
			let fullLine = line;
			while (fullLine.endsWith("=") && i + 1 < lines.length) {
				fullLine = fullLine.slice(0, -1) + lines[++i];
			}

			// Strip the encoding/charset parameters
			fullLine = fullLine.replace(
				/;ENCODING=QUOTED-PRINTABLE(?:;CHARSET=[^;:]*)?/gi,
				"",
			);

			// Decode the value portion
			const colonIdx = fullLine.indexOf(":");
			if (colonIdx > -1) {
				const prop = fullLine.slice(0, colonIdx + 1);
				const value = fullLine.slice(colonIdx + 1);
				output.push(prop + decodeQuotedPrintable(value));
			} else {
				output.push(fullLine);
			}
			continue;
		}

		// Convert AALARM/DALARM to VALARM (best-effort)
		// DALARM:19980101T120000;;;Display text
		// AALARM:19980101T120000;;;audio.wav
		if (/^[AD]ALARM\s*:/i.test(line)) {
			const isAudio = /^AALARM/i.test(line);
			const value = line.slice(line.indexOf(":") + 1);
			const parts = value.split(";");
			const triggerDate = parts[0]?.trim();

			if (triggerDate) {
				output.push("BEGIN:VALARM");
				output.push(`ACTION:${isAudio ? "AUDIO" : "DISPLAY"}`);
				output.push(`TRIGGER;VALUE=DATE-TIME:${triggerDate}`);
				const desc = parts[3]?.trim();
				if (desc) {
					output.push(`DESCRIPTION:${decodeQuotedPrintable(desc)}`);
				}
				output.push("END:VALARM");
			}
			continue;
		}

		output.push(line);
	}

	return output.join("\r\n");
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Parse ICS/VCS/iCal file content using ical.js.
 * Handles both iCalendar 2.0 (.ics, .ical, .ifb) and vCalendar 1.0 (.vcs)
 * by normalizing VCS content before parsing.
 */
export function parseIcs(content: string): CalendarData {
	const data: CalendarData = {
		version: "2.0",
		prodId: "-//dysumi//Calendar//EN",
		events: [],
	};

	try {
		// Normalize VCS 1.0 to iCalendar 2.0 if needed
		const normalized = isVCalendar1(content) ? normalizeVcs(content) : content;

		const jcalData = ICAL.parse(normalized);
		const comp = new ICAL.Component(jcalData);

		// Get calendar properties
		const versionProp = comp.getFirstPropertyValue("version");
		if (versionProp) {
			data.version = String(versionProp);
		}

		const prodIdProp = comp.getFirstPropertyValue("prodid");
		if (prodIdProp) {
			data.prodId = String(prodIdProp);
		}

		const calNameProp = comp.getFirstPropertyValue("x-wr-calname");
		if (calNameProp) {
			data.calName = String(calNameProp);
		}

		// Parse VEVENTs
		const vevents = comp.getAllSubcomponents("vevent");
		for (const vevent of vevents) {
			const event = new ICAL.Event(vevent);
			const calEvent = parseVEvent(event, vevent);
			if (calEvent) {
				data.events.push(calEvent);
			}
		}

		// Parse VTODOs
		const vtodos = comp.getAllSubcomponents("vtodo");
		for (const vtodo of vtodos) {
			const calEvent = parseVTodo(vtodo);
			if (calEvent) {
				data.events.push(calEvent);
			}
		}

		// Parse VJOURNALs
		const vjournals = comp.getAllSubcomponents("vjournal");
		for (const vjournal of vjournals) {
			const calEvent = parseVJournal(vjournal);
			if (calEvent) {
				data.events.push(calEvent);
			}
		}
	} catch {
		/* gracefully return partial data on parse failure */
	}

	return data;
}

/** Convert a JS Date to an ICAL.Time */
function toIcalTime(d: Date, allDay?: boolean): ICAL.Time {
	const t = ICAL.Time.fromJSDate(d, false);
	if (allDay) t.isDate = true;
	return t;
}

/** Add a property to a component only if the value is non-empty */
function addIfPresent(comp: ICAL.Component, name: string, val: unknown): void {
	if (val == null || val === "") return;
	comp.addPropertyWithValue(name, typeof val === "number" ? String(val) : val);
}

/** Serialize organizer to an ICAL property on the component */
function serializeOrganizer(comp: ICAL.Component, event: CalendarEvent): void {
	if (!event.organizer?.email) return;
	const p = new ICAL.Property("organizer");
	p.setValue(`mailto:${event.organizer.email}`);
	if (event.organizer.name) p.setParameter("cn", event.organizer.name);
	if (event.organizer.dir) p.setParameter("dir", event.organizer.dir);
	if (event.organizer.sentBy)
		p.setParameter("sent-by", `mailto:${event.organizer.sentBy}`);
	comp.addProperty(p);
}

/** Serialize attendees to ICAL properties on the component */
function serializeAttendees(comp: ICAL.Component, event: CalendarEvent): void {
	for (const att of event.attendees ?? []) {
		const p = new ICAL.Property("attendee");
		p.setValue(`mailto:${att.email}`);
		let rsvpValue: string | undefined;
		if (att.rsvp != null) {
			rsvpValue = att.rsvp ? "TRUE" : "FALSE";
		}
		const params: [string, string | undefined][] = [
			["cn", att.name],
			["role", att.role],
			["partstat", att.partstat],
			["rsvp", rsvpValue],
			["cutype", att.cutype],
			[
				"delegated-from",
				att.delegatedFrom ? `mailto:${att.delegatedFrom}` : undefined,
			],
			[
				"delegated-to",
				att.delegatedTo ? `mailto:${att.delegatedTo}` : undefined,
			],
			["sent-by", att.sentBy ? `mailto:${att.sentBy}` : undefined],
			["dir", att.dir],
		];
		for (const [k, v] of params) if (v) p.setParameter(k, v);
		comp.addProperty(p);
	}
}

/** Serialize recurrence rules, dates, and exceptions */
function serializeRecurrence(comp: ICAL.Component, event: CalendarEvent): void {
	const rruleStr =
		event.rruleString ?? (event.rrule ? buildRRuleString(event.rrule) : null);
	if (rruleStr) {
		try {
			comp.addPropertyWithValue("rrule", ICAL.Recur.fromString(rruleStr));
		} catch {
			/* skip */
		}
	}
	for (const rd of event.rdate ?? [])
		comp.addPropertyWithValue("rdate", toIcalTime(rd, false));
	for (const ex of event.exdate ?? [])
		comp.addPropertyWithValue("exdate", toIcalTime(ex, false));
	if (event.recurrenceId)
		comp.addPropertyWithValue(
			"recurrence-id",
			toIcalTime(event.recurrenceId, event.allDay),
		);
	for (const rel of event.relatedTo ?? [])
		addIfPresent(comp, "related-to", rel);
}

/** Serialize alarms to VALARM subcomponents */
function serializeAlarms(comp: ICAL.Component, event: CalendarEvent): void {
	for (const alarm of event.alarms ?? []) {
		const v = new ICAL.Component("valarm");
		v.addPropertyWithValue("action", alarm.action);
		const tp = new ICAL.Property("trigger");
		tp.setValue(alarm.trigger);
		if (alarm.triggerRelation)
			tp.setParameter("related", alarm.triggerRelation);
		v.addProperty(tp);
		const alarmScalars: [string, unknown][] = [
			["description", alarm.description],
			["summary", alarm.summary],
			["repeat", alarm.repeat],
			["duration", alarm.duration],
			["attach", alarm.attach],
		];
		for (const [k, val] of alarmScalars) {
			if (val != null && val !== "") v.addPropertyWithValue(k, val);
		}
		for (const email of alarm.attendees ?? [])
			v.addPropertyWithValue("attendee", `mailto:${email}`);
		comp.addSubcomponent(v);
	}
}

/** Serialize attachments to ATTACH properties */
function serializeAttachments(
	comp: ICAL.Component,
	event: CalendarEvent,
): void {
	for (const att of event.attachments ?? []) {
		const p = new ICAL.Property("attach");
		if (att.data) {
			p.setValue(att.data);
			p.setParameter("encoding", "BASE64");
			p.setParameter("value", "BINARY");
		} else if (att.uri) {
			p.setValue(att.uri);
		}
		if (att.mimeType) p.setParameter("fmttype", att.mimeType);
		if (att.filename) p.setParameter("x-filename", att.filename);
		comp.addProperty(p);
	}
}

/** Serialize a single CalendarEvent to an ICAL component */
function serializeEvent(event: CalendarEvent): ICAL.Component {
	const comp = new ICAL.Component(event.type.toLowerCase());

	// Required
	addIfPresent(comp, "uid", event.uid);
	addIfPresent(comp, "summary", event.summary);
	comp.addPropertyWithValue("dtstart", toIcalTime(event.start, event.allDay));
	if (event.type === "VTODO" && event.due) {
		comp.addPropertyWithValue("due", toIcalTime(event.due, event.allDay));
	} else if (event.end) {
		comp.addPropertyWithValue("dtend", toIcalTime(event.end, event.allDay));
	}

	// Scalar properties (data-driven)
	const scalars: [string, unknown][] = [
		["description", event.description],
		["location", event.location],
		["status", event.status],
		["class", event.classification],
		["transp", event.transp],
		["priority", event.priority],
		["url", event.url],
		["comment", event.comment],
		["contact", event.contact],
		["sequence", event.sequence],
	];
	for (const [name, val] of scalars) addIfPresent(comp, name, val);

	if (event.categories && event.categories.length > 0)
		addIfPresent(comp, "categories", event.categories.join(","));
	if (event.resources && event.resources.length > 0)
		addIfPresent(comp, "resources", event.resources.join(","));
	if (event.geo) addIfPresent(comp, "geo", `${event.geo.lat};${event.geo.lon}`);

	// VTODO-specific
	if (event.type === "VTODO") {
		addIfPresent(comp, "percent-complete", event.percentComplete);
		if (event.completed)
			addIfPresent(comp, "completed", toIcalTime(event.completed, false));
	}

	// Timestamps
	if (event.created)
		addIfPresent(comp, "created", toIcalTime(event.created, false));
	if (event.lastModified)
		addIfPresent(comp, "last-modified", toIcalTime(event.lastModified, false));
	comp.addPropertyWithValue("dtstamp", ICAL.Time.now());

	serializeOrganizer(comp, event);
	serializeAttendees(comp, event);
	serializeRecurrence(comp, event);
	serializeAlarms(comp, event);
	serializeAttachments(comp, event);

	return comp;
}

/**
 * Serialize CalendarData back to an ICS string using ical.js.
 * This is the inverse of parseIcs – it converts our internal CalendarEvent
 * objects into proper VCALENDAR/VEVENT/VTODO/VJOURNAL components.
 */
export function serializeIcs(data: CalendarData): string {
	const cal = new ICAL.Component("vcalendar");
	cal.addPropertyWithValue("version", data.version || "2.0");
	cal.addPropertyWithValue("prodid", data.prodId || "-//dysumi//Calendar//EN");

	if (data.calName) {
		cal.addPropertyWithValue("x-wr-calname", data.calName);
	}
	if (data.calDesc) {
		cal.addPropertyWithValue("x-wr-caldesc", data.calDesc);
	}

	for (const event of data.events) {
		cal.addSubcomponent(serializeEvent(event));
	}

	return cal.toString();
}

// biome-ignore lint/performance/noBarrelFile: module facade with own exports (parseIcs, serializeIcs)
export { buildRRuleString, createNewEvent, generateUid } from "./helpers";

export type {
	CalendarAlarm,
	CalendarAttachment,
	CalendarAttendee,
	CalendarData,
	CalendarEvent,
	CalendarOrganizer,
	GeoPosition,
	RecurrenceRule,
} from "./types";

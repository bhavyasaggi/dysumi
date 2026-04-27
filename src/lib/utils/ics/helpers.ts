import type ICAL from "ical.js";

import type {
	CalendarAlarm,
	CalendarAttachment,
	CalendarAttendee,
	CalendarEvent,
	CalendarOrganizer,
	RecurrenceRule,
} from "./types";

export function generateUid(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2)}@dysumi`;
}

export function createNewEvent(
	partial?: Partial<CalendarEvent>,
): CalendarEvent {
	const now = new Date();
	const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

	return {
		uid: generateUid(),
		type: "VEVENT",
		summary: "New Event",
		start: now,
		end: oneHourLater,
		allDay: false,
		...partial,
	};
}

export function icalTimeToDate(icalTime: ICAL.Time | null): Date | undefined {
	if (!icalTime) return undefined;
	return icalTime.toJSDate();
}

export function isAllDayTime(icalTime: ICAL.Time | null): boolean {
	if (!icalTime) return false;
	return icalTime.isDate;
}

export function parseAlarms(component: ICAL.Component): CalendarAlarm[] {
	const alarms: CalendarAlarm[] = [];
	const valarms = component.getAllSubcomponents("valarm");

	for (const valarm of valarms) {
		const action = valarm.getFirstPropertyValue("action");
		const trigger = valarm.getFirstProperty("trigger");

		if (!(action && trigger)) continue;

		const alarm: CalendarAlarm = {
			action: String(action).toUpperCase() as CalendarAlarm["action"],
			trigger: String(trigger.getFirstValue()),
		};

		const related = trigger.getParameter("related");
		if (related) {
			alarm.triggerRelation = String(
				related,
			).toUpperCase() as CalendarAlarm["triggerRelation"];
		}

		const description = valarm.getFirstPropertyValue("description");
		if (description) alarm.description = String(description);

		const summary = valarm.getFirstPropertyValue("summary");
		if (summary) alarm.summary = String(summary);

		const repeat = valarm.getFirstPropertyValue("repeat");
		if (repeat) alarm.repeat = Number(repeat);

		const duration = valarm.getFirstPropertyValue("duration");
		if (duration) alarm.duration = String(duration);

		const attach = valarm.getFirstPropertyValue("attach");
		if (attach) alarm.attach = String(attach);

		// Get attendees for EMAIL alarms
		const attendees = valarm.getAllProperties("attendee");
		if (attendees.length > 0) {
			alarm.attendees = attendees.map((att) =>
				String(att.getFirstValue()).replace(/^mailto:/i, ""),
			);
		}

		alarms.push(alarm);
	}

	return alarms;
}

export function parseAttendees(component: ICAL.Component): CalendarAttendee[] {
	const attendees: CalendarAttendee[] = [];
	const props = component.getAllProperties("attendee");

	for (const prop of props) {
		const email = String(prop.getFirstValue()).replace(/^mailto:/i, "");

		const attendee: CalendarAttendee = { email };

		const cn = prop.getParameter("cn");
		if (cn) attendee.name = String(cn);

		const role = prop.getParameter("role");
		if (role)
			attendee.role = String(role).toUpperCase() as CalendarAttendee["role"];

		const partstat = prop.getParameter("partstat");
		if (partstat)
			attendee.partstat = String(
				partstat,
			).toUpperCase() as CalendarAttendee["partstat"];

		const rsvp = prop.getParameter("rsvp");
		if (rsvp) attendee.rsvp = String(rsvp).toUpperCase() === "TRUE";

		const cutype = prop.getParameter("cutype");
		if (cutype)
			attendee.cutype = String(
				cutype,
			).toUpperCase() as CalendarAttendee["cutype"];

		const delegatedFrom = prop.getParameter("delegated-from");
		if (delegatedFrom)
			attendee.delegatedFrom = String(delegatedFrom).replace(/^mailto:/i, "");

		const delegatedTo = prop.getParameter("delegated-to");
		if (delegatedTo)
			attendee.delegatedTo = String(delegatedTo).replace(/^mailto:/i, "");

		const sentBy = prop.getParameter("sent-by");
		if (sentBy) attendee.sentBy = String(sentBy).replace(/^mailto:/i, "");

		const dir = prop.getParameter("dir");
		if (dir) attendee.dir = String(dir);

		attendees.push(attendee);
	}

	return attendees;
}

export function parseOrganizer(
	component: ICAL.Component,
): CalendarOrganizer | undefined {
	const prop = component.getFirstProperty("organizer");
	if (!prop) return undefined;

	const email = String(prop.getFirstValue()).replace(/^mailto:/i, "");
	const organizer: CalendarOrganizer = { email };

	const cn = prop.getParameter("cn");
	if (cn) organizer.name = String(cn);

	const dir = prop.getParameter("dir");
	if (dir) organizer.dir = String(dir);

	const sentBy = prop.getParameter("sent-by");
	if (sentBy) organizer.sentBy = String(sentBy).replace(/^mailto:/i, "");

	return organizer;
}

export function parseAttachments(
	component: ICAL.Component,
): CalendarAttachment[] {
	const attachments: CalendarAttachment[] = [];
	const props = component.getAllProperties("attach");

	for (const prop of props) {
		const value = prop.getFirstValue();
		const attachment: CalendarAttachment = {};

		const encoding = prop.getParameter("encoding");
		if (encoding && String(encoding).toUpperCase() === "BASE64") {
			attachment.data = String(value);
		} else {
			attachment.uri = String(value);
		}

		const fmttype = prop.getParameter("fmttype");
		if (fmttype) attachment.mimeType = String(fmttype);

		const filename =
			prop.getParameter("x-filename") || prop.getParameter("filename");
		if (filename) attachment.filename = String(filename);

		attachments.push(attachment);
	}

	return attachments;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: RFC 5545 RRULE has many optional fields
export function parseRRule(
	recur: ICAL.Recur | null,
): RecurrenceRule | undefined {
	if (!recur) return undefined;

	try {
		const rule: RecurrenceRule = {
			freq: recur.freq as RecurrenceRule["freq"],
		};

		if (recur.interval && recur.interval > 1) rule.interval = recur.interval;
		if (recur.count) rule.count = recur.count;
		if (recur.until) rule.until = recur.until.toJSDate();
		const p = recur.parts;
		if ((p.BYSECOND?.length ?? 0) > 0) rule.bySecond = p.BYSECOND;
		if ((p.BYMINUTE?.length ?? 0) > 0) rule.byMinute = p.BYMINUTE;
		if ((p.BYHOUR?.length ?? 0) > 0) rule.byHour = p.BYHOUR;
		if ((p.BYDAY?.length ?? 0) > 0) rule.byDay = p.BYDAY;
		if ((p.BYMONTHDAY?.length ?? 0) > 0) rule.byMonthDay = p.BYMONTHDAY;
		if ((p.BYYEARDAY?.length ?? 0) > 0) rule.byYearDay = p.BYYEARDAY;
		if ((p.BYWEEKNO?.length ?? 0) > 0) rule.byWeekNo = p.BYWEEKNO;
		if ((p.BYMONTH?.length ?? 0) > 0) rule.byMonth = p.BYMONTH;
		if ((p.BYSETPOS?.length ?? 0) > 0) rule.bySetPos = p.BYSETPOS;
		if (recur.wkst && recur.wkst !== 1) {
			const days = ["", "SU", "MO", "TU", "WE", "TH", "FR", "SA"];
			rule.wkst = days[recur.wkst] as RecurrenceRule["wkst"];
		}

		return rule;
	} catch {
		return undefined;
	}
}

/** Build an RFC 5545 RRULE string from a parsed RecurrenceRule object. */
export function buildRRuleString(rule: RecurrenceRule): string {
	const parts: string[] = [`FREQ=${rule.freq}`];
	const push = (key: string, val: unknown) => {
		if (val != null) parts.push(`${key}=${val}`);
	};
	const pushArr = (key: string, arr?: (string | number)[]) => {
		if (arr && arr.length > 0) parts.push(`${key}=${arr.join(",")}`);
	};

	if (rule.interval && rule.interval > 1) push("INTERVAL", rule.interval);
	push("COUNT", rule.count);
	if (rule.until) {
		const pad = (n: number) => String(n).padStart(2, "0");
		const d = rule.until;
		push(
			"UNTIL",
			`${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`,
		);
	}
	pushArr("BYDAY", rule.byDay);
	pushArr("BYMONTHDAY", rule.byMonthDay);
	pushArr("BYMONTH", rule.byMonth);
	pushArr("BYYEARDAY", rule.byYearDay);
	pushArr("BYWEEKNO", rule.byWeekNo);
	pushArr("BYHOUR", rule.byHour);
	pushArr("BYMINUTE", rule.byMinute);
	pushArr("BYSECOND", rule.bySecond);
	pushArr("BYSETPOS", rule.bySetPos);
	push("WKST", rule.wkst);

	return parts.join(";");
}

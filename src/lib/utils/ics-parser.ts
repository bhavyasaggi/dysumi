/**
 * ICS/VCS Parser and Serializer
 * Uses ical.js for parsing
 * Supports full iCalendar RFC 5545 specification
 */

import ICAL from "ical.js";

// Alarm/Reminder interface
export interface CalendarAlarm {
	action: "AUDIO" | "DISPLAY" | "EMAIL";
	trigger: string; // e.g., "-PT15M" for 15 minutes before, or absolute datetime
	triggerRelation?: "START" | "END"; // relative to start or end
	description?: string;
	summary?: string; // for EMAIL action
	attendees?: string[]; // for EMAIL action
	repeat?: number;
	duration?: string; // e.g., "PT5M" for repeat interval
	attach?: string; // for AUDIO action - sound file URL
}

// Recurrence rule interface
export interface RecurrenceRule {
	freq: "SECONDLY" | "MINUTELY" | "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
	interval?: number;
	count?: number;
	until?: Date;
	bySecond?: number[];
	byMinute?: number[];
	byHour?: number[];
	byDay?: string[]; // e.g., ["MO", "TU", "WE"] or ["1MO", "-1FR"]
	byMonthDay?: number[];
	byYearDay?: number[];
	byWeekNo?: number[];
	byMonth?: number[];
	bySetPos?: number[];
	wkst?: "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA";
}

// Attendee interface with full properties
export interface CalendarAttendee {
	email: string;
	name?: string;
	role?: "CHAIR" | "REQ-PARTICIPANT" | "OPT-PARTICIPANT" | "NON-PARTICIPANT";
	partstat?: "NEEDS-ACTION" | "ACCEPTED" | "DECLINED" | "TENTATIVE" | "DELEGATED";
	rsvp?: boolean;
	cutype?: "INDIVIDUAL" | "GROUP" | "RESOURCE" | "ROOM" | "UNKNOWN";
	delegatedFrom?: string;
	delegatedTo?: string;
	sentBy?: string;
	dir?: string; // directory entry URI
}

// Organizer interface
export interface CalendarOrganizer {
	email: string;
	name?: string;
	dir?: string;
	sentBy?: string;
}

// Geographic position
export interface GeoPosition {
	lat: number;
	lon: number;
}

// Attachment interface
export interface CalendarAttachment {
	uri?: string;
	data?: string; // base64 encoded
	mimeType?: string;
	filename?: string;
}

export interface CalendarEvent {
	uid: string;
	type: "VEVENT" | "VTODO" | "VJOURNAL";
	summary: string;
	description?: string;
	location?: string;
	start: Date;
	end?: Date;
	allDay?: boolean;
	
	// Status
	status?: "TENTATIVE" | "CONFIRMED" | "CANCELLED" | "NEEDS-ACTION" | "COMPLETED" | "IN-PROCESS" | "DRAFT" | "FINAL";
	
	// Classification
	classification?: "PUBLIC" | "PRIVATE" | "CONFIDENTIAL";
	
	// Free/Busy transparency
	transp?: "OPAQUE" | "TRANSPARENT";
	
	// Priority (1-9, 1=highest)
	priority?: number;
	
	// Categories and resources
	categories?: string[];
	resources?: string[];
	
	// URL and comments
	url?: string;
	comment?: string;
	
	// Geographic location
	geo?: GeoPosition;
	
	// Organizer and attendees
	organizer?: CalendarOrganizer;
	attendees?: CalendarAttendee[];
	
	// Recurrence
	rrule?: RecurrenceRule;
	rruleString?: string; // raw RRULE string
	rdate?: Date[]; // additional recurrence dates
	exdate?: Date[]; // exception dates
	recurrenceId?: Date; // for modified instances
	
	// Alarms/Reminders
	alarms?: CalendarAlarm[];
	
	// Attachments
	attachments?: CalendarAttachment[];
	
	// Related events
	relatedTo?: string[];
	
	// Timestamps
	created?: Date;
	lastModified?: Date;
	sequence?: number;
	
	// For VTODO
	completed?: Date;
	percentComplete?: number;
	due?: Date;
	
	// Contact
	contact?: string;
	
	// Internal: original UID for expanded recurring instances (not serialized)
	_originalUid?: string;
	// Internal: flag indicating this is an expanded instance (not serialized)
	_isRecurrenceInstance?: boolean;
}

export interface CalendarData {
	version: string;
	prodId: string;
	calName?: string;
	calDesc?: string;
	timezone?: string;
	events: CalendarEvent[];
}

/**
 * Convert ICAL.Time to JavaScript Date
 */
function icalTimeToDate(icalTime: ICAL.Time | null): Date | undefined {
	if (!icalTime) return undefined;
	return icalTime.toJSDate();
}

/**
 * Check if ICAL.Time represents an all-day event
 */
function isAllDayTime(icalTime: ICAL.Time | null): boolean {
	if (!icalTime) return false;
	return icalTime.isDate;
}

/**
 * Parse RRULE string into RecurrenceRule object
 */
function parseRRule(rrule: ICAL.Recur | string | null): RecurrenceRule | undefined {
	if (!rrule) return undefined;
	
	try {
		const recur = typeof rrule === "string" ? ICAL.Recur.fromString(rrule) : rrule;
		
		const rule: RecurrenceRule = {
			freq: recur.freq as RecurrenceRule["freq"],
		};
		
		if (recur.interval && recur.interval > 1) rule.interval = recur.interval;
		if (recur.count) rule.count = recur.count;
		if (recur.until) rule.until = recur.until.toJSDate();
		if (recur.parts.BYSECOND?.length) rule.bySecond = recur.parts.BYSECOND;
		if (recur.parts.BYMINUTE?.length) rule.byMinute = recur.parts.BYMINUTE;
		if (recur.parts.BYHOUR?.length) rule.byHour = recur.parts.BYHOUR;
		if (recur.parts.BYDAY?.length) rule.byDay = recur.parts.BYDAY;
		if (recur.parts.BYMONTHDAY?.length) rule.byMonthDay = recur.parts.BYMONTHDAY;
		if (recur.parts.BYYEARDAY?.length) rule.byYearDay = recur.parts.BYYEARDAY;
		if (recur.parts.BYWEEKNO?.length) rule.byWeekNo = recur.parts.BYWEEKNO;
		if (recur.parts.BYMONTH?.length) rule.byMonth = recur.parts.BYMONTH;
		if (recur.parts.BYSETPOS?.length) rule.bySetPos = recur.parts.BYSETPOS;
		if (recur.wkst && recur.wkst !== 1) {
			const days = ["", "SU", "MO", "TU", "WE", "TH", "FR", "SA"];
			rule.wkst = days[recur.wkst] as RecurrenceRule["wkst"];
		}
		
		return rule;
	} catch {
		return undefined;
	}
}

/**
 * Parse VALARM components
 */
function parseAlarms(component: ICAL.Component): CalendarAlarm[] {
	const alarms: CalendarAlarm[] = [];
	const valarms = component.getAllSubcomponents("valarm");
	
	for (const valarm of valarms) {
		const action = valarm.getFirstPropertyValue("action");
		const trigger = valarm.getFirstProperty("trigger");
		
		if (!action || !trigger) continue;
		
		const alarm: CalendarAlarm = {
			action: String(action).toUpperCase() as CalendarAlarm["action"],
			trigger: String(trigger.getFirstValue()),
		};
		
		const related = trigger.getParameter("related");
		if (related) {
			alarm.triggerRelation = String(related).toUpperCase() as "START" | "END";
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
			alarm.attendees = attendees.map(att => String(att.getFirstValue()).replace(/^mailto:/i, ""));
		}
		
		alarms.push(alarm);
	}
	
	return alarms;
}

/**
 * Parse attendees with full properties
 */
function parseAttendees(component: ICAL.Component): CalendarAttendee[] {
	const attendees: CalendarAttendee[] = [];
	const props = component.getAllProperties("attendee");
	
	for (const prop of props) {
		const email = String(prop.getFirstValue()).replace(/^mailto:/i, "");
		
		const attendee: CalendarAttendee = { email };
		
		const cn = prop.getParameter("cn");
		if (cn) attendee.name = String(cn);
		
		const role = prop.getParameter("role");
		if (role) attendee.role = String(role).toUpperCase() as CalendarAttendee["role"];
		
		const partstat = prop.getParameter("partstat");
		if (partstat) attendee.partstat = String(partstat).toUpperCase() as CalendarAttendee["partstat"];
		
		const rsvp = prop.getParameter("rsvp");
		if (rsvp) attendee.rsvp = String(rsvp).toUpperCase() === "TRUE";
		
		const cutype = prop.getParameter("cutype");
		if (cutype) attendee.cutype = String(cutype).toUpperCase() as CalendarAttendee["cutype"];
		
		const delegatedFrom = prop.getParameter("delegated-from");
		if (delegatedFrom) attendee.delegatedFrom = String(delegatedFrom).replace(/^mailto:/i, "");
		
		const delegatedTo = prop.getParameter("delegated-to");
		if (delegatedTo) attendee.delegatedTo = String(delegatedTo).replace(/^mailto:/i, "");
		
		const sentBy = prop.getParameter("sent-by");
		if (sentBy) attendee.sentBy = String(sentBy).replace(/^mailto:/i, "");
		
		const dir = prop.getParameter("dir");
		if (dir) attendee.dir = String(dir);
		
		attendees.push(attendee);
	}
	
	return attendees;
}

/**
 * Parse organizer with full properties
 */
function parseOrganizer(component: ICAL.Component): CalendarOrganizer | undefined {
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

/**
 * Parse attachments
 */
function parseAttachments(component: ICAL.Component): CalendarAttachment[] {
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
		
		const filename = prop.getParameter("x-filename") || prop.getParameter("filename");
		if (filename) attachment.filename = String(filename);
		
		attachments.push(attachment);
	}
	
	return attachments;
}

/**
 * Parse ICS/VCS file content using ical.js
 */
export function parseIcs(content: string): CalendarData {
	const data: CalendarData = {
		version: "2.0",
		prodId: "-//dysumi//Calendar//EN",
		events: [],
	};

	try {
		const jcalData = ICAL.parse(content);
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
	} catch (error) {
		console.error("Failed to parse ICS content:", error);
	}

	return data;
}

/**
 * Parse a VEVENT component
 */
function parseVEvent(event: ICAL.Event, vevent: ICAL.Component): CalendarEvent | null {
	const uid = event.uid || generateUid();
	const summary = event.summary || "Untitled Event";
	const startDate = event.startDate;

	if (!startDate) {
		return null;
	}

	const calEvent: CalendarEvent = {
		uid,
		type: "VEVENT",
		summary,
		description: event.description || undefined,
		location: event.location || undefined,
		start: icalTimeToDate(startDate) || new Date(),
		end: icalTimeToDate(event.endDate) || undefined,
		allDay: isAllDayTime(startDate),
		sequence: event.sequence || undefined,
	};

	// Organizer
	calEvent.organizer = parseOrganizer(vevent);

	// Attendees
	const attendees = parseAttendees(vevent);
	if (attendees.length > 0) calEvent.attendees = attendees;

	// Status
	const statusProp = vevent.getFirstPropertyValue("status");
	if (statusProp) {
		calEvent.status = String(statusProp).toUpperCase() as CalendarEvent["status"];
	}

	// Classification
	const classProp = vevent.getFirstPropertyValue("class");
	if (classProp) {
		calEvent.classification = String(classProp).toUpperCase() as CalendarEvent["classification"];
	}

	// Transparency (Free/Busy)
	const transpProp = vevent.getFirstPropertyValue("transp");
	if (transpProp) {
		calEvent.transp = String(transpProp).toUpperCase() as CalendarEvent["transp"];
	}

	// Priority
	const priorityProp = vevent.getFirstPropertyValue("priority");
	if (priorityProp !== null && priorityProp !== undefined) {
		calEvent.priority = Number(priorityProp);
	}

	// Categories
	const categoriesProp = vevent.getFirstPropertyValue("categories");
	if (categoriesProp) {
		calEvent.categories = Array.isArray(categoriesProp) 
			? categoriesProp.map(String) 
			: [String(categoriesProp)];
	}

	// Resources
	const resourcesProp = vevent.getFirstPropertyValue("resources");
	if (resourcesProp) {
		calEvent.resources = Array.isArray(resourcesProp) 
			? resourcesProp.map(String) 
			: [String(resourcesProp)];
	}

	// URL
	const urlProp = vevent.getFirstPropertyValue("url");
	if (urlProp) calEvent.url = String(urlProp);

	// Comment
	const commentProp = vevent.getFirstPropertyValue("comment");
	if (commentProp) calEvent.comment = String(commentProp);

	// Contact
	const contactProp = vevent.getFirstPropertyValue("contact");
	if (contactProp) calEvent.contact = String(contactProp);

	// Geographic position
	const geoProp = vevent.getFirstPropertyValue("geo");
	if (geoProp) {
		const geoStr = String(geoProp);
		const parts = geoStr.split(";");
		if (parts.length === 2) {
			calEvent.geo = {
				lat: Number.parseFloat(parts[0]),
				lon: Number.parseFloat(parts[1]),
			};
		}
	}

	// Recurrence Rule
	const rruleProp = vevent.getFirstPropertyValue("rrule");
	if (rruleProp) {
		calEvent.rruleString = rruleProp.toString();
		calEvent.rrule = parseRRule(rruleProp as ICAL.Recur);
	}

	// Recurrence dates (RDATE)
	const rdateProps = vevent.getAllProperties("rdate");
	if (rdateProps.length > 0) {
		calEvent.rdate = [];
		for (const rdateProp of rdateProps) {
			const val = rdateProp.getFirstValue() as ICAL.Time;
			if (val) calEvent.rdate.push(icalTimeToDate(val) as Date);
		}
	}

	// Exception dates (EXDATE)
	const exdateProps = vevent.getAllProperties("exdate");
	if (exdateProps.length > 0) {
		calEvent.exdate = [];
		for (const exdateProp of exdateProps) {
			const val = exdateProp.getFirstValue() as ICAL.Time;
			if (val) calEvent.exdate.push(icalTimeToDate(val) as Date);
		}
	}

	// Recurrence ID (for modified instances)
	const recurrenceIdProp = vevent.getFirstPropertyValue("recurrence-id");
	if (recurrenceIdProp) {
		calEvent.recurrenceId = icalTimeToDate(recurrenceIdProp as ICAL.Time);
	}

	// Related-to
	const relatedToProps = vevent.getAllProperties("related-to");
	if (relatedToProps.length > 0) {
		calEvent.relatedTo = relatedToProps.map(prop => String(prop.getFirstValue()));
	}

	// Created
	const createdProp = vevent.getFirstPropertyValue("created");
	if (createdProp) {
		calEvent.created = icalTimeToDate(createdProp as ICAL.Time);
	}

	// Last modified
	const lastModProp = vevent.getFirstPropertyValue("last-modified");
	if (lastModProp) {
		calEvent.lastModified = icalTimeToDate(lastModProp as ICAL.Time);
	}

	// Alarms
	const alarms = parseAlarms(vevent);
	if (alarms.length > 0) calEvent.alarms = alarms;

	// Attachments
	const attachments = parseAttachments(vevent);
	if (attachments.length > 0) calEvent.attachments = attachments;

	return calEvent;
}

/**
 * Parse a VTODO component
 */
function parseVTodo(vtodo: ICAL.Component): CalendarEvent | null {
	const uid = vtodo.getFirstPropertyValue("uid") || generateUid();
	const summary = vtodo.getFirstPropertyValue("summary") || "Untitled Todo";
	const dtstart = vtodo.getFirstPropertyValue("dtstart") as ICAL.Time | null;

	const calEvent: CalendarEvent = {
		uid: String(uid),
		type: "VTODO",
		summary: String(summary),
		start: icalTimeToDate(dtstart) || new Date(),
		allDay: isAllDayTime(dtstart),
	};

	const description = vtodo.getFirstPropertyValue("description");
	if (description) calEvent.description = String(description);

	const location = vtodo.getFirstPropertyValue("location");
	if (location) calEvent.location = String(location);

	const due = vtodo.getFirstPropertyValue("due") as ICAL.Time | null;
	if (due) calEvent.due = icalTimeToDate(due);

	const completed = vtodo.getFirstPropertyValue("completed") as ICAL.Time | null;
	if (completed) calEvent.completed = icalTimeToDate(completed);

	const percentComplete = vtodo.getFirstPropertyValue("percent-complete");
	if (percentComplete !== null && percentComplete !== undefined) {
		calEvent.percentComplete = Number(percentComplete);
	}

	const priority = vtodo.getFirstPropertyValue("priority");
	if (priority !== null && priority !== undefined) calEvent.priority = Number(priority);

	const status = vtodo.getFirstPropertyValue("status");
	if (status) calEvent.status = String(status).toUpperCase() as CalendarEvent["status"];

	// Classification
	const classProp = vtodo.getFirstPropertyValue("class");
	if (classProp) {
		calEvent.classification = String(classProp).toUpperCase() as CalendarEvent["classification"];
	}

	const url = vtodo.getFirstPropertyValue("url");
	if (url) calEvent.url = String(url);

	const categories = vtodo.getFirstPropertyValue("categories");
	if (categories) {
		calEvent.categories = Array.isArray(categories) ? categories.map(String) : [String(categories)];
	}

	// Resources
	const resources = vtodo.getFirstPropertyValue("resources");
	if (resources) {
		calEvent.resources = Array.isArray(resources) ? resources.map(String) : [String(resources)];
	}

	// Comment
	const comment = vtodo.getFirstPropertyValue("comment");
	if (comment) calEvent.comment = String(comment);

	// Contact
	const contact = vtodo.getFirstPropertyValue("contact");
	if (contact) calEvent.contact = String(contact);

	// Organizer
	calEvent.organizer = parseOrganizer(vtodo);

	// Attendees
	const attendees = parseAttendees(vtodo);
	if (attendees.length > 0) calEvent.attendees = attendees;

	// Recurrence
	const rruleProp = vtodo.getFirstPropertyValue("rrule");
	if (rruleProp) {
		calEvent.rruleString = rruleProp.toString();
		calEvent.rrule = parseRRule(rruleProp as ICAL.Recur);
	}

	// Alarms
	const alarms = parseAlarms(vtodo);
	if (alarms.length > 0) calEvent.alarms = alarms;

	// Attachments
	const attachments = parseAttachments(vtodo);
	if (attachments.length > 0) calEvent.attachments = attachments;

	// Related-to
	const relatedToProps = vtodo.getAllProperties("related-to");
	if (relatedToProps.length > 0) {
		calEvent.relatedTo = relatedToProps.map(prop => String(prop.getFirstValue()));
	}

	// Geo
	const geoProp = vtodo.getFirstPropertyValue("geo");
	if (geoProp) {
		const geoStr = String(geoProp);
		const parts = geoStr.split(";");
		if (parts.length === 2) {
			calEvent.geo = {
				lat: Number.parseFloat(parts[0]),
				lon: Number.parseFloat(parts[1]),
			};
		}
	}

	return calEvent;
}

/**
 * Parse a VJOURNAL component
 */
function parseVJournal(vjournal: ICAL.Component): CalendarEvent | null {
	const uid = vjournal.getFirstPropertyValue("uid") || generateUid();
	const summary = vjournal.getFirstPropertyValue("summary") || "Untitled Journal";
	const dtstart = vjournal.getFirstPropertyValue("dtstart") as ICAL.Time | null;

	const calEvent: CalendarEvent = {
		uid: String(uid),
		type: "VJOURNAL",
		summary: String(summary),
		start: icalTimeToDate(dtstart) || new Date(),
		allDay: isAllDayTime(dtstart),
	};

	const description = vjournal.getFirstPropertyValue("description");
	if (description) calEvent.description = String(description);

	const status = vjournal.getFirstPropertyValue("status");
	if (status) calEvent.status = String(status).toUpperCase() as CalendarEvent["status"];

	// Classification
	const classProp = vjournal.getFirstPropertyValue("class");
	if (classProp) {
		calEvent.classification = String(classProp).toUpperCase() as CalendarEvent["classification"];
	}

	const url = vjournal.getFirstPropertyValue("url");
	if (url) calEvent.url = String(url);

	const categories = vjournal.getFirstPropertyValue("categories");
	if (categories) {
		calEvent.categories = Array.isArray(categories) ? categories.map(String) : [String(categories)];
	}

	// Comment
	const comment = vjournal.getFirstPropertyValue("comment");
	if (comment) calEvent.comment = String(comment);

	// Contact
	const contact = vjournal.getFirstPropertyValue("contact");
	if (contact) calEvent.contact = String(contact);

	// Organizer
	calEvent.organizer = parseOrganizer(vjournal);

	// Attendees
	const attendees = parseAttendees(vjournal);
	if (attendees.length > 0) calEvent.attendees = attendees;

	// Recurrence
	const rruleProp = vjournal.getFirstPropertyValue("rrule");
	if (rruleProp) {
		calEvent.rruleString = rruleProp.toString();
		calEvent.rrule = parseRRule(rruleProp as ICAL.Recur);
	}

	// Attachments
	const attachments = parseAttachments(vjournal);
	if (attachments.length > 0) calEvent.attachments = attachments;

	// Related-to
	const relatedToProps = vjournal.getAllProperties("related-to");
	if (relatedToProps.length > 0) {
		calEvent.relatedTo = relatedToProps.map(prop => String(prop.getFirstValue()));
	}

	return calEvent;
}

/**
 * Serialize calendar data to ICS format
 */
export function serializeIcs(data: CalendarData): string {
	const lines: string[] = [
		"BEGIN:VCALENDAR",
		`VERSION:${data.version || "2.0"}`,
		`PRODID:${data.prodId || "-//dysumi//Calendar//EN"}`,
	];

	if (data.calName) {
		lines.push(`X-WR-CALNAME:${data.calName}`);
	}

	for (const event of data.events) {
		if (event.type === "VTODO") {
			lines.push(serializeVTodo(event));
		} else if (event.type === "VJOURNAL") {
			lines.push(serializeVJournal(event));
		} else {
			lines.push(serializeVEvent(event));
		}
	}

	lines.push("END:VCALENDAR");
	return lines.join("\r\n");
}

/**
 * Format date for ICS
 */
function formatIcsDate(date: Date, allDay = false): string {
	if (allDay) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}${month}${day}`;
	}
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hour = String(date.getHours()).padStart(2, "0");
	const minute = String(date.getMinutes()).padStart(2, "0");
	const second = String(date.getSeconds()).padStart(2, "0");
	return `${year}${month}${day}T${hour}${minute}${second}`;
}

/**
 * Escape text for ICS
 */
function escapeText(text: string): string {
	return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/\n/g, "\\n").replace(/;/g, "\\;");
}

/**
 * Serialize recurrence rule to RRULE string
 */
function serializeRRule(rrule: RecurrenceRule): string {
	const parts: string[] = [`FREQ=${rrule.freq}`];
	
	if (rrule.interval && rrule.interval > 1) parts.push(`INTERVAL=${rrule.interval}`);
	if (rrule.count) parts.push(`COUNT=${rrule.count}`);
	if (rrule.until) parts.push(`UNTIL=${formatIcsDate(rrule.until)}Z`);
	if (rrule.bySecond?.length) parts.push(`BYSECOND=${rrule.bySecond.join(",")}`);
	if (rrule.byMinute?.length) parts.push(`BYMINUTE=${rrule.byMinute.join(",")}`);
	if (rrule.byHour?.length) parts.push(`BYHOUR=${rrule.byHour.join(",")}`);
	if (rrule.byDay?.length) parts.push(`BYDAY=${rrule.byDay.join(",")}`);
	if (rrule.byMonthDay?.length) parts.push(`BYMONTHDAY=${rrule.byMonthDay.join(",")}`);
	if (rrule.byYearDay?.length) parts.push(`BYYEARDAY=${rrule.byYearDay.join(",")}`);
	if (rrule.byWeekNo?.length) parts.push(`BYWEEKNO=${rrule.byWeekNo.join(",")}`);
	if (rrule.byMonth?.length) parts.push(`BYMONTH=${rrule.byMonth.join(",")}`);
	if (rrule.bySetPos?.length) parts.push(`BYSETPOS=${rrule.bySetPos.join(",")}`);
	if (rrule.wkst) parts.push(`WKST=${rrule.wkst}`);
	
	return parts.join(";");
}

/**
 * Serialize alarms
 */
function serializeAlarms(alarms: CalendarAlarm[]): string[] {
	const lines: string[] = [];
	
	for (const alarm of alarms) {
		lines.push("BEGIN:VALARM");
		lines.push(`ACTION:${alarm.action}`);
		
		if (alarm.triggerRelation) {
			lines.push(`TRIGGER;RELATED=${alarm.triggerRelation}:${alarm.trigger}`);
		} else {
			lines.push(`TRIGGER:${alarm.trigger}`);
		}
		
		if (alarm.description) lines.push(`DESCRIPTION:${escapeText(alarm.description)}`);
		if (alarm.summary) lines.push(`SUMMARY:${escapeText(alarm.summary)}`);
		if (alarm.repeat) lines.push(`REPEAT:${alarm.repeat}`);
		if (alarm.duration) lines.push(`DURATION:${alarm.duration}`);
		if (alarm.attach) lines.push(`ATTACH:${alarm.attach}`);
		
		if (alarm.attendees?.length) {
			for (const attendee of alarm.attendees) {
				lines.push(`ATTENDEE:mailto:${attendee}`);
			}
		}
		
		lines.push("END:VALARM");
	}
	
	return lines;
}

/**
 * Serialize attendees
 */
function serializeAttendees(attendees: CalendarAttendee[]): string[] {
	const lines: string[] = [];
	
	for (const att of attendees) {
		const params: string[] = [];
		
		if (att.name) params.push(`CN=${att.name}`);
		if (att.role) params.push(`ROLE=${att.role}`);
		if (att.partstat) params.push(`PARTSTAT=${att.partstat}`);
		if (att.rsvp !== undefined) params.push(`RSVP=${att.rsvp ? "TRUE" : "FALSE"}`);
		if (att.cutype) params.push(`CUTYPE=${att.cutype}`);
		if (att.delegatedFrom) params.push(`DELEGATED-FROM=mailto:${att.delegatedFrom}`);
		if (att.delegatedTo) params.push(`DELEGATED-TO=mailto:${att.delegatedTo}`);
		if (att.sentBy) params.push(`SENT-BY=mailto:${att.sentBy}`);
		if (att.dir) params.push(`DIR="${att.dir}"`);
		
		const paramStr = params.length > 0 ? `;${params.join(";")}` : "";
		lines.push(`ATTENDEE${paramStr}:mailto:${att.email}`);
	}
	
	return lines;
}

/**
 * Serialize organizer
 */
function serializeOrganizer(organizer: CalendarOrganizer): string {
	const params: string[] = [];
	
	if (organizer.name) params.push(`CN=${organizer.name}`);
	if (organizer.dir) params.push(`DIR="${organizer.dir}"`);
	if (organizer.sentBy) params.push(`SENT-BY=mailto:${organizer.sentBy}`);
	
	const paramStr = params.length > 0 ? `;${params.join(";")}` : "";
	return `ORGANIZER${paramStr}:mailto:${organizer.email}`;
}

/**
 * Serialize a VEVENT manually
 */
function serializeVEvent(event: CalendarEvent): string {
	const lines: string[] = ["BEGIN:VEVENT"];
	lines.push(`UID:${event.uid}`);
	lines.push(`DTSTAMP:${formatIcsDate(new Date())}Z`);
	lines.push(`SUMMARY:${escapeText(event.summary)}`);

	if (event.allDay) {
		lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.start, true)}`);
		if (event.end) lines.push(`DTEND;VALUE=DATE:${formatIcsDate(event.end, true)}`);
	} else {
		lines.push(`DTSTART:${formatIcsDate(event.start)}`);
		if (event.end) lines.push(`DTEND:${formatIcsDate(event.end)}`);
	}

	if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
	if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
	if (event.url) lines.push(`URL:${event.url}`);
	if (event.status) lines.push(`STATUS:${event.status}`);
	if (event.classification) lines.push(`CLASS:${event.classification}`);
	if (event.transp) lines.push(`TRANSP:${event.transp}`);
	if (event.priority !== undefined) lines.push(`PRIORITY:${event.priority}`);
	if (event.categories?.length) lines.push(`CATEGORIES:${event.categories.join(",")}`);
	if (event.resources?.length) lines.push(`RESOURCES:${event.resources.join(",")}`);
	if (event.comment) lines.push(`COMMENT:${escapeText(event.comment)}`);
	if (event.contact) lines.push(`CONTACT:${escapeText(event.contact)}`);
	if (event.sequence !== undefined) lines.push(`SEQUENCE:${event.sequence}`);
	
	// Geographic position
	if (event.geo) {
		lines.push(`GEO:${event.geo.lat};${event.geo.lon}`);
	}
	
	// Organizer
	if (event.organizer) {
		lines.push(serializeOrganizer(event.organizer));
	}
	
	// Attendees
	if (event.attendees?.length) {
		lines.push(...serializeAttendees(event.attendees));
	}
	
	// Recurrence
	if (event.rrule) {
		lines.push(`RRULE:${serializeRRule(event.rrule)}`);
	} else if (event.rruleString) {
		lines.push(`RRULE:${event.rruleString}`);
	}
	
	// RDATE
	if (event.rdate?.length) {
		for (const date of event.rdate) {
			lines.push(`RDATE:${formatIcsDate(date)}`);
		}
	}
	
	// EXDATE
	if (event.exdate?.length) {
		for (const date of event.exdate) {
			lines.push(`EXDATE:${formatIcsDate(date)}`);
		}
	}
	
	// Recurrence ID
	if (event.recurrenceId) {
		lines.push(`RECURRENCE-ID:${formatIcsDate(event.recurrenceId)}`);
	}
	
	// Related-to
	if (event.relatedTo?.length) {
		for (const uid of event.relatedTo) {
			lines.push(`RELATED-TO:${uid}`);
		}
	}
	
	// Attachments
	if (event.attachments?.length) {
		for (const att of event.attachments) {
			if (att.data) {
				const params = [`ENCODING=BASE64`];
				if (att.mimeType) params.push(`FMTTYPE=${att.mimeType}`);
				if (att.filename) params.push(`X-FILENAME=${att.filename}`);
				lines.push(`ATTACH;${params.join(";")}:${att.data}`);
			} else if (att.uri) {
				const params: string[] = [];
				if (att.mimeType) params.push(`FMTTYPE=${att.mimeType}`);
				if (att.filename) params.push(`X-FILENAME=${att.filename}`);
				const paramStr = params.length > 0 ? `;${params.join(";")}` : "";
				lines.push(`ATTACH${paramStr}:${att.uri}`);
			}
		}
	}
	
	// Alarms
	if (event.alarms?.length) {
		lines.push(...serializeAlarms(event.alarms));
	}

	lines.push("END:VEVENT");
	return lines.join("\r\n") + "\r\n";
}

/**
 * Serialize a VTODO
 */
function serializeVTodo(event: CalendarEvent): string {
	const lines: string[] = ["BEGIN:VTODO"];
	lines.push(`UID:${event.uid}`);
	lines.push(`DTSTAMP:${formatIcsDate(new Date())}Z`);
	lines.push(`SUMMARY:${escapeText(event.summary)}`);

	if (event.start) {
		if (event.allDay) {
			lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.start, true)}`);
		} else {
			lines.push(`DTSTART:${formatIcsDate(event.start)}`);
		}
	}

	if (event.due) lines.push(`DUE:${formatIcsDate(event.due)}`);
	if (event.completed) lines.push(`COMPLETED:${formatIcsDate(event.completed)}`);
	if (event.percentComplete !== undefined) lines.push(`PERCENT-COMPLETE:${event.percentComplete}`);
	if (event.priority !== undefined) lines.push(`PRIORITY:${event.priority}`);
	if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
	if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
	if (event.url) lines.push(`URL:${event.url}`);
	if (event.status) lines.push(`STATUS:${event.status}`);
	if (event.classification) lines.push(`CLASS:${event.classification}`);
	if (event.categories?.length) lines.push(`CATEGORIES:${event.categories.join(",")}`);
	if (event.resources?.length) lines.push(`RESOURCES:${event.resources.join(",")}`);
	if (event.comment) lines.push(`COMMENT:${escapeText(event.comment)}`);
	if (event.contact) lines.push(`CONTACT:${escapeText(event.contact)}`);
	
	// Geographic position
	if (event.geo) {
		lines.push(`GEO:${event.geo.lat};${event.geo.lon}`);
	}
	
	// Organizer
	if (event.organizer) {
		lines.push(serializeOrganizer(event.organizer));
	}
	
	// Attendees
	if (event.attendees?.length) {
		lines.push(...serializeAttendees(event.attendees));
	}
	
	// Recurrence
	if (event.rrule) {
		lines.push(`RRULE:${serializeRRule(event.rrule)}`);
	} else if (event.rruleString) {
		lines.push(`RRULE:${event.rruleString}`);
	}
	
	// Related-to
	if (event.relatedTo?.length) {
		for (const uid of event.relatedTo) {
			lines.push(`RELATED-TO:${uid}`);
		}
	}
	
	// Attachments
	if (event.attachments?.length) {
		for (const att of event.attachments) {
			if (att.uri) {
				lines.push(`ATTACH:${att.uri}`);
			}
		}
	}
	
	// Alarms
	if (event.alarms?.length) {
		lines.push(...serializeAlarms(event.alarms));
	}

	lines.push("END:VTODO");
	return lines.join("\r\n") + "\r\n";
}

/**
 * Serialize a VJOURNAL
 */
function serializeVJournal(event: CalendarEvent): string {
	const lines: string[] = ["BEGIN:VJOURNAL"];
	lines.push(`UID:${event.uid}`);
	lines.push(`DTSTAMP:${formatIcsDate(new Date())}Z`);
	lines.push(`SUMMARY:${escapeText(event.summary)}`);

	if (event.start) {
		if (event.allDay) {
			lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.start, true)}`);
		} else {
			lines.push(`DTSTART:${formatIcsDate(event.start)}`);
		}
	}

	if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
	if (event.url) lines.push(`URL:${event.url}`);
	if (event.status) lines.push(`STATUS:${event.status}`);
	if (event.classification) lines.push(`CLASS:${event.classification}`);
	if (event.categories?.length) lines.push(`CATEGORIES:${event.categories.join(",")}`);
	if (event.comment) lines.push(`COMMENT:${escapeText(event.comment)}`);
	if (event.contact) lines.push(`CONTACT:${escapeText(event.contact)}`);
	
	// Organizer
	if (event.organizer) {
		lines.push(serializeOrganizer(event.organizer));
	}
	
	// Attendees
	if (event.attendees?.length) {
		lines.push(...serializeAttendees(event.attendees));
	}
	
	// Recurrence
	if (event.rrule) {
		lines.push(`RRULE:${serializeRRule(event.rrule)}`);
	} else if (event.rruleString) {
		lines.push(`RRULE:${event.rruleString}`);
	}
	
	// Related-to
	if (event.relatedTo?.length) {
		for (const uid of event.relatedTo) {
			lines.push(`RELATED-TO:${uid}`);
		}
	}
	
	// Attachments
	if (event.attachments?.length) {
		for (const att of event.attachments) {
			if (att.uri) {
				lines.push(`ATTACH:${att.uri}`);
			}
		}
	}

	lines.push("END:VJOURNAL");
	return lines.join("\r\n") + "\r\n";
}

/**
 * Generate a new unique ID
 */
export function generateUid(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2)}@dysumi`;
}

/**
 * Create an empty calendar structure
 */
export function createEmptyCalendar(): CalendarData {
	return {
		version: "2.0",
		prodId: "-//dysumi//Calendar//EN",
		events: [],
	};
}

/**
 * Create a new event with default values
 */
export function createNewEvent(partial?: Partial<CalendarEvent>): CalendarEvent {
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

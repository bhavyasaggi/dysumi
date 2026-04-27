import type ICAL from "ical.js";

import {
	generateUid,
	icalTimeToDate,
	isAllDayTime,
	parseAlarms,
	parseAttachments,
	parseAttendees,
	parseOrganizer,
	parseRRule,
} from "./helpers";

import type { CalendarEvent } from "./types";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: iCalendar VTODO has many optional properties to parse
export function parseVTodo(vtodo: ICAL.Component): CalendarEvent | null {
	const uid = vtodo.getFirstPropertyValue("uid") || generateUid();
	const summary = vtodo.getFirstPropertyValue("summary") || "Untitled Todo";
	const dtstart = vtodo.getFirstPropertyValue("dtstart") as ICAL.Time | null;

	const calEvent: CalendarEvent = {
		uid: String(uid),
		type: "VTODO",
		summary: String(summary),
		start: icalTimeToDate(dtstart) ?? new Date(),
		allDay: isAllDayTime(dtstart),
	};

	const description = vtodo.getFirstPropertyValue("description");
	if (description) calEvent.description = String(description);

	const location = vtodo.getFirstPropertyValue("location");
	if (location) calEvent.location = String(location);

	const due = vtodo.getFirstPropertyValue("due") as ICAL.Time | null;
	if (due) calEvent.due = icalTimeToDate(due);

	const completed = vtodo.getFirstPropertyValue(
		"completed",
	) as ICAL.Time | null;
	if (completed) calEvent.completed = icalTimeToDate(completed);

	const percentComplete = vtodo.getFirstPropertyValue("percent-complete");
	if (percentComplete !== null && percentComplete !== undefined) {
		calEvent.percentComplete = Number(percentComplete);
	}

	const priority = vtodo.getFirstPropertyValue("priority");
	if (priority !== null && priority !== undefined)
		calEvent.priority = Number(priority);

	const status = vtodo.getFirstPropertyValue("status");
	if (status)
		calEvent.status = String(status).toUpperCase() as CalendarEvent["status"];

	// Classification
	const classProp = vtodo.getFirstPropertyValue("class");
	if (classProp) {
		calEvent.classification = String(
			classProp,
		).toUpperCase() as CalendarEvent["classification"];
	}

	const url = vtodo.getFirstPropertyValue("url");
	if (url) calEvent.url = String(url);

	const categories = vtodo.getFirstPropertyValue("categories");
	if (categories) {
		calEvent.categories = Array.isArray(categories)
			? categories.map(String)
			: [String(categories)];
	}

	// Resources
	const resources = vtodo.getFirstPropertyValue("resources");
	if (resources) {
		calEvent.resources = Array.isArray(resources)
			? resources.map(String)
			: [String(resources)];
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
		calEvent.relatedTo = relatedToProps.map((prop) =>
			String(prop.getFirstValue()),
		);
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

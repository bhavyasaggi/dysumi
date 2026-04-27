import type ICAL from "ical.js";
import {
	generateUid,
	icalTimeToDate,
	isAllDayTime,
	parseAttachments,
	parseAttendees,
	parseOrganizer,
	parseRRule,
} from "./helpers";
import type { CalendarEvent } from "./types";

export function parseVJournal(vjournal: ICAL.Component): CalendarEvent | null {
	const uid = vjournal.getFirstPropertyValue("uid") || generateUid();
	const summary =
		vjournal.getFirstPropertyValue("summary") || "Untitled Journal";
	const dtstart = vjournal.getFirstPropertyValue("dtstart") as ICAL.Time | null;

	const calEvent: CalendarEvent = {
		uid: String(uid),
		type: "VJOURNAL",
		summary: String(summary),
		start: icalTimeToDate(dtstart) ?? new Date(),
		allDay: isAllDayTime(dtstart),
	};

	const description = vjournal.getFirstPropertyValue("description");
	if (description) calEvent.description = String(description);

	const status = vjournal.getFirstPropertyValue("status");
	if (status)
		calEvent.status = String(status).toUpperCase() as CalendarEvent["status"];

	// Classification
	const classProp = vjournal.getFirstPropertyValue("class");
	if (classProp) {
		calEvent.classification = String(
			classProp,
		).toUpperCase() as CalendarEvent["classification"];
	}

	const url = vjournal.getFirstPropertyValue("url");
	if (url) calEvent.url = String(url);

	const categories = vjournal.getFirstPropertyValue("categories");
	if (categories) {
		calEvent.categories = Array.isArray(categories)
			? categories.map(String)
			: [String(categories)];
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
		calEvent.relatedTo = relatedToProps.map((prop) =>
			String(prop.getFirstValue()),
		);
	}

	return calEvent;
}

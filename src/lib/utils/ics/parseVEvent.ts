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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: iCalendar VEVENT has many optional properties to parse
export function parseVEvent(
	event: ICAL.Event,
	vevent: ICAL.Component,
): CalendarEvent | null {
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
		start: icalTimeToDate(startDate) ?? new Date(),
		end: icalTimeToDate(event.endDate) ?? undefined,
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
		calEvent.status = String(
			statusProp,
		).toUpperCase() as CalendarEvent["status"];
	}

	// Classification
	const classProp = vevent.getFirstPropertyValue("class");
	if (classProp) {
		calEvent.classification = String(
			classProp,
		).toUpperCase() as CalendarEvent["classification"];
	}

	// Transparency (Free/Busy)
	const transpProp = vevent.getFirstPropertyValue("transp");
	if (transpProp) {
		calEvent.transp = String(
			transpProp,
		).toUpperCase() as CalendarEvent["transp"];
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
		calEvent.relatedTo = relatedToProps.map((prop) =>
			String(prop.getFirstValue()),
		);
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

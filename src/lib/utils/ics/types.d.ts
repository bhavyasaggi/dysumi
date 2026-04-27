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
	freq:
		| "SECONDLY"
		| "MINUTELY"
		| "HOURLY"
		| "DAILY"
		| "WEEKLY"
		| "MONTHLY"
		| "YEARLY";
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
	partstat?:
		| "NEEDS-ACTION"
		| "ACCEPTED"
		| "DECLINED"
		| "TENTATIVE"
		| "DELEGATED";
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
	status?:
		| "TENTATIVE"
		| "CONFIRMED"
		| "CANCELLED"
		| "NEEDS-ACTION"
		| "COMPLETED"
		| "IN-PROCESS"
		| "DRAFT"
		| "FINAL";

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

import {
	ActionIcon,
	Badge,
	Box,
	Button,
	Card,
	Center,
	Checkbox,
	CloseButton,
	Container,
	Divider,
	Flex,
	Grid,
	Group,
	InputLabel,
	Modal,
	MultiSelect,
	NumberInput,
	Paper,
	ScrollArea,
	SegmentedControl,
	Select,
	Space,
	Stack,
	Stepper,
	Switch,
	Text,
	Textarea,
	TextInput,
	Timeline,
	Title,
	Tooltip,
} from "@mantine/core";
import { Calendar, DateTimePicker, DateInput } from "@mantine/dates";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useCallback, useEffect, useMemo, useState, useId } from "react";
import Icon from "@/lib/ui/Icon";
import {
	createNewEvent,
	generateUid,
	type CalendarData,
	type CalendarEvent,
	type CalendarAlarm,
	type CalendarAttendee,
	type RecurrenceRule,
} from "@/lib/utils/ics-parser";

import "@mantine/dates/styles.css";
import styles from "./styles.module.scss";

export interface EditorCalendarProps {
	defaultValue: CalendarData;
	onChange?: (data: CalendarData) => void;
	readOnly?: boolean;
}

type ViewMode = "calendar" | "list";

// Localized month and day names
const MONTH_NAMES = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December"
];
const SHORT_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Helper functions
function getStartOfDay(date: Date): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

function getEndOfDay(date: Date): Date {
	const d = new Date(date);
	d.setHours(23, 59, 59, 999);
	return d;
}

function formatDate(date: Date, format: string): string {
	const padZero = (n: number) => String(n).padStart(2, "0");
	// Order matters: replace longer patterns first to avoid partial matches
	return format
		.replace("YYYY", String(date.getFullYear()))
		.replace("MMMM", MONTH_NAMES[date.getMonth()])
		.replace("MMM", SHORT_MONTH_NAMES[date.getMonth()])
		.replace("MM", padZero(date.getMonth() + 1))
		.replace("dddd", DAY_NAMES[date.getDay()])
		.replace("DD", padZero(date.getDate()))
		.replace("HH", padZero(date.getHours()))
		.replace("mm", padZero(date.getMinutes()));
}

function formatTime(date: Date): string {
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const ampm = hours >= 12 ? "PM" : "AM";
	const displayHours = hours % 12 || 12;
	return `${displayHours}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

function isSameDay(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate();
}

function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
	const dayStart = getStartOfDay(date);
	const dayEnd = getEndOfDay(date);
	return events.filter(event => {
		const eventStart = new Date(event.start);
		const eventEnd = event.end ? new Date(event.end) : eventStart;
		return eventStart <= dayEnd && eventEnd >= dayStart;
	});
}

// Day of week mapping for RRULE (Sunday = 0)
const DAY_MAP: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/**
 * Generate all occurrences of a recurring event within a date range.
 * This correctly handles DAILY, WEEKLY, MONTHLY, and YEARLY frequencies.
 * All date operations use UTC to avoid timezone/DST issues.
 */
function expandRecurringEvents(
	events: CalendarEvent[],
	rangeStart: Date,
	rangeEnd: Date
): CalendarEvent[] {
	const expanded: CalendarEvent[] = [];

	for (const event of events) {
		// Skip if event has internal properties (already expanded) - shouldn't happen but guard
		if (event._isRecurrenceInstance) {
			continue;
		}

		if (!event.rrule) {
			// Non-recurring event - include if in range
			const eventStart = new Date(event.start);
			if (eventStart >= rangeStart && eventStart <= rangeEnd) {
				expanded.push(event);
			}
			continue;
		}

		// Expand recurring event
		const occurrences = generateRecurrenceOccurrences(event, rangeStart, rangeEnd);
		expanded.push(...occurrences);
	}

	return expanded.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/**
 * Get the day of week (0-6, Sunday=0) for a date, using local time.
 * This is consistent with how we display dates to users.
 */
function getDayOfWeek(date: Date): number {
	return date.getDay();
}

/**
 * Get a date representing the Sunday of the week containing the given date.
 * Always returns Sunday regardless of wkst, for consistent week iteration.
 */
function getSundayOfWeek(date: Date): Date {
	const result = new Date(date);
	result.setHours(0, 0, 0, 0);
	const dayOfWeek = result.getDay();
	result.setDate(result.getDate() - dayOfWeek);
	return result;
}

/**
 * Generate occurrences for a single recurring event within a date range.
 */
function generateRecurrenceOccurrences(
	event: CalendarEvent,
	rangeStart: Date,
	rangeEnd: Date
): CalendarEvent[] {
	const rrule = event.rrule;
	if (!rrule) return [];

	const occurrences: CalendarEvent[] = [];
	const originalStart = new Date(event.start);
	const originalEnd = event.end ? new Date(event.end) : null;
	const duration = originalEnd ? originalEnd.getTime() - originalStart.getTime() : 0;
	const interval = rrule.interval || 1;

	// Store original time components for preserving time across occurrences
	const originalHours = originalStart.getHours();
	const originalMinutes = originalStart.getMinutes();
	const originalSeconds = originalStart.getSeconds();
	const originalMs = originalStart.getMilliseconds();

	// Build exception dates set for quick lookup (using date string for reliable comparison)
	const exdates = new Set(
		(event.exdate || []).map(d => {
			const date = new Date(d);
			return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
		})
	);

	// Max occurrences to generate (safety limit)
	const maxToGenerate = rrule.count || 1000;
	const untilDate = rrule.until ? new Date(rrule.until) : rangeEnd;

	// Track how many occurrences we've generated (for COUNT limit)
	let totalGenerated = 0;

	/**
	 * Helper to check if a date is excluded
	 */
	const isExcluded = (date: Date): boolean => {
		const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
		return exdates.has(key);
	};

	/**
	 * Helper to create occurrence at a specific date, preserving original time
	 */
	const createOccurrenceAt = (year: number, month: number, day: number): CalendarEvent | null => {
		const occurrenceDate = new Date(year, month, day, originalHours, originalMinutes, originalSeconds, originalMs);

		// Validate the date is what we expect (handles month overflow)
		if (occurrenceDate.getDate() !== day || occurrenceDate.getMonth() !== month) {
			return null;
		}

		return createOccurrenceInstance(event, occurrenceDate, duration);
	};

	switch (rrule.freq) {
		case "DAILY": {
			let currentYear = originalStart.getFullYear();
			let currentMonth = originalStart.getMonth();
			let currentDay = originalStart.getDate();

			while (totalGenerated < maxToGenerate) {
				const current = new Date(currentYear, currentMonth, currentDay, originalHours, originalMinutes, originalSeconds, originalMs);

				if (current > rangeEnd || current > untilDate) break;

				if (current >= rangeStart && !isExcluded(current)) {
					const occurrence = createOccurrenceAt(currentYear, currentMonth, currentDay);
					if (occurrence) occurrences.push(occurrence);
				}

				totalGenerated++;

				// Move to next day using date components to avoid DST issues
				const next = new Date(currentYear, currentMonth, currentDay + interval);
				currentYear = next.getFullYear();
				currentMonth = next.getMonth();
				currentDay = next.getDate();
			}
			break;
		}

		case "WEEKLY": {
			// WEEKLY recurrence: can have byDay to specify which days of week
			// byDay values are day codes like "MO", "TU", etc.
			// DAY_MAP converts them to 0-6 where 0=Sunday
			const byDays = rrule.byDay?.length
				? rrule.byDay.map(d => DAY_MAP[d.replace(/^-?\d+/, "")])
				: [getDayOfWeek(originalStart)];

			// Sort days so we process them in order (Sun=0 through Sat=6)
			const sortedDays = [...byDays].sort((a, b) => a - b);

			// Start from the Sunday of the week containing the original start
			let weekSunday = getSundayOfWeek(originalStart);

			while (totalGenerated < maxToGenerate) {
				// Check if we've gone past the end
				const weekEnd = new Date(weekSunday);
				weekEnd.setDate(weekEnd.getDate() + 6);
				if (weekSunday > rangeEnd || weekSunday > untilDate) break;

				// Check each specified day of this week
				for (const targetDayOfWeek of sortedDays) {
					if (totalGenerated >= maxToGenerate) break;

					// Calculate the date for this day of week
					// targetDayOfWeek is 0-6 (Sun-Sat), and weekSunday is always Sunday
					const occurrenceYear = weekSunday.getFullYear();
					const occurrenceMonth = weekSunday.getMonth();
					const occurrenceDay = weekSunday.getDate() + targetDayOfWeek;

					// Create the date to check
					const dayDate = new Date(occurrenceYear, occurrenceMonth, occurrenceDay, originalHours, originalMinutes, originalSeconds, originalMs);

					// Verify the day of week is correct (sanity check)
					if (getDayOfWeek(dayDate) !== targetDayOfWeek) {
						// This shouldn't happen, but skip if it does
						continue;
					}

					// Must be >= original start date
					if (dayDate < originalStart) continue;
					// Must be within range and limits
					if (dayDate > rangeEnd || dayDate > untilDate) continue;

					if (dayDate >= rangeStart && !isExcluded(dayDate)) {
						const occurrence = createOccurrenceInstance(event, dayDate, duration);
						occurrences.push(occurrence);
					}
					totalGenerated++;
				}

				// Move to next week (interval weeks later)
				const nextSunday = new Date(weekSunday);
				nextSunday.setDate(nextSunday.getDate() + 7 * interval);
				weekSunday = nextSunday;
			}
			break;
		}

		case "MONTHLY": {
			let currentYear = originalStart.getFullYear();
			let currentMonth = originalStart.getMonth();
			const originalDay = originalStart.getDate();

			while (totalGenerated < maxToGenerate) {
				const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

				if (rrule.byMonthDay?.length) {
					// Specific days of month
					for (const day of rrule.byMonthDay) {
						if (totalGenerated >= maxToGenerate) break;

						const actualDay = day < 0 ? daysInMonth + day + 1 : day;
						if (actualDay < 1 || actualDay > daysInMonth) continue;

						const dayDate = new Date(currentYear, currentMonth, actualDay, originalHours, originalMinutes, originalSeconds, originalMs);

						if (dayDate < originalStart) continue;
						if (dayDate > rangeEnd || dayDate > untilDate) continue;

						if (dayDate >= rangeStart && !isExcluded(dayDate)) {
							const occurrence = createOccurrenceAt(currentYear, currentMonth, actualDay);
							if (occurrence) occurrences.push(occurrence);
						}
						totalGenerated++;
					}
				} else {
					// Same day of month
					const actualDay = Math.min(originalDay, daysInMonth);
					const current = new Date(currentYear, currentMonth, actualDay, originalHours, originalMinutes, originalSeconds, originalMs);

					if (current > rangeEnd || current > untilDate) break;

					if (current >= rangeStart && !isExcluded(current)) {
						const occurrence = createOccurrenceAt(currentYear, currentMonth, actualDay);
						if (occurrence) occurrences.push(occurrence);
					}
					totalGenerated++;
				}

				// Move to next month
				currentMonth += interval;
				while (currentMonth >= 12) {
					currentMonth -= 12;
					currentYear++;
				}

				// Check if we've gone too far
				const checkDate = new Date(currentYear, currentMonth, 1);
				if (checkDate > rangeEnd && checkDate > untilDate) break;
			}
			break;
		}

		case "YEARLY": {
			let currentYear = originalStart.getFullYear();
			const originalMonth = originalStart.getMonth();
			const originalDay = originalStart.getDate();

			while (totalGenerated < maxToGenerate) {
				// Handle Feb 29 for leap years
				const daysInMonth = new Date(currentYear, originalMonth + 1, 0).getDate();
				const actualDay = Math.min(originalDay, daysInMonth);

				const current = new Date(currentYear, originalMonth, actualDay, originalHours, originalMinutes, originalSeconds, originalMs);

				if (current > rangeEnd || current > untilDate) break;

				if (current >= rangeStart && !isExcluded(current)) {
					const occurrence = createOccurrenceAt(currentYear, originalMonth, actualDay);
					if (occurrence) occurrences.push(occurrence);
				}
				totalGenerated++;
				currentYear += interval;
			}
			break;
		}

		default: {
			// Fallback: treat as daily
			let currentYear = originalStart.getFullYear();
			let currentMonth = originalStart.getMonth();
			let currentDay = originalStart.getDate();

			while (totalGenerated < maxToGenerate) {
				const current = new Date(currentYear, currentMonth, currentDay, originalHours, originalMinutes, originalSeconds, originalMs);

				if (current > rangeEnd || current > untilDate) break;

				if (current >= rangeStart && !isExcluded(current)) {
					const occurrence = createOccurrenceAt(currentYear, currentMonth, currentDay);
					if (occurrence) occurrences.push(occurrence);
				}
				totalGenerated++;

				const next = new Date(currentYear, currentMonth, currentDay + 1);
				currentYear = next.getFullYear();
				currentMonth = next.getMonth();
				currentDay = next.getDate();
			}
		}
	}

	return occurrences;
}

/**
 * Create an occurrence instance from an event with a specific start date.
 * The instance has a unique display UID but tracks the original event's UID.
 */
function createOccurrenceInstance(
	event: CalendarEvent,
	startDate: Date,
	duration: number
): CalendarEvent {
	return {
		...event,
		uid: `${event.uid}__RECURRENCE__${startDate.getTime()}`, // Unique display ID with clear separator
		_originalUid: event.uid, // Track original event UID
		_isRecurrenceInstance: true, // Mark as expanded instance
		start: new Date(startDate),
		end: duration > 0 ? new Date(startDate.getTime() + duration) : undefined,
	};
}



/**
 * Find the original event for a recurring instance.
 * If the event is a recurrence instance, returns the original event from the list.
 * Otherwise returns the event itself.
 */
function findOriginalEvent(event: CalendarEvent, allEvents: CalendarEvent[]): CalendarEvent {
	if (!event._isRecurrenceInstance || !event._originalUid) {
		return event;
	}

	const original = allEvents.find(e => e.uid === event._originalUid);
	return original || event;
}

// Convert date picker string to Date
function parsePickerDate(value: string | null | undefined): Date | undefined {
	if (!value) return undefined;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

// Event colors
function getEventTypeColor(type: CalendarEvent["type"]): string {
	switch (type) {
		case "VTODO": return "orange";
		case "VJOURNAL": return "grape";
		default: return "blue";
	}
}

function getEventStatusColor(status?: string): string {
	switch (status) {
		case "CONFIRMED": return "green";
		case "CANCELLED": return "red";
		case "TENTATIVE": return "yellow";
		default: return "gray";
	}
}

function getEventTypeLabel(type: CalendarEvent["type"]): string {
	switch (type) {
		case "VTODO": return "To-Do";
		case "VJOURNAL": return "Journal";
		default: return "Event";
	}
}

function getEventTypeIcon(type: CalendarEvent["type"]): "calendar" | "check-square" | "book-open" {
	switch (type) {
		case "VTODO": return "check-square";
		case "VJOURNAL": return "book-open";
		default: return "calendar";
	}
}

// Frequency unit labels for display
const FREQ_UNITS: Record<string, { singular: string; plural: string }> = {
	DAILY: { singular: "day", plural: "days" },
	WEEKLY: { singular: "week", plural: "weeks" },
	MONTHLY: { singular: "month", plural: "months" },
	YEARLY: { singular: "year", plural: "years" },
};

const WEEKDAYS = [
	{ value: "MO", label: "Mon" },
	{ value: "TU", label: "Tue" },
	{ value: "WE", label: "Wed" },
	{ value: "TH", label: "Thu" },
	{ value: "FR", label: "Fri" },
	{ value: "SA", label: "Sat" },
	{ value: "SU", label: "Sun" },
];

const ALARM_PRESETS = [
	{ value: "-PT0M", label: "At time of event" },
	{ value: "-PT5M", label: "5 minutes before" },
	{ value: "-PT10M", label: "10 minutes before" },
	{ value: "-PT15M", label: "15 minutes before" },
	{ value: "-PT30M", label: "30 minutes before" },
	{ value: "-PT1H", label: "1 hour before" },
	{ value: "-PT2H", label: "2 hours before" },
	{ value: "-P1D", label: "1 day before" },
	{ value: "-P2D", label: "2 days before" },
	{ value: "-P1W", label: "1 week before" },
];

// Parse alarm trigger to human readable
function formatAlarmTrigger(trigger: string): string {
	const preset = ALARM_PRESETS.find(p => p.value === trigger);
	if (preset) return preset.label;
	return trigger;
}

// Multi-step Event Editor Modal
function EventEditorModal({
	opened,
	onClose,
	event,
	onSave,
	onDelete,
}: {
	opened: boolean;
	onClose: () => void;
	event: CalendarEvent | null;
	onSave: (event: CalendarEvent) => void;
	onDelete?: (uid: string) => void;
}) {
	const [formData, setFormData] = useState<Partial<CalendarEvent>>({});
	const [activeStep, setActiveStep] = useState(0);
	const [newAttendeeEmail, setNewAttendeeEmail] = useState("");
	const formId = useId();

	// Reset form when event changes
	useEffect(() => {
		if (event) {
			setFormData({
				...event,
				start: new Date(event.start),
				end: event.end ? new Date(event.end) : undefined,
				due: event.due ? new Date(event.due) : undefined,
			});
		} else {
			setFormData({
				type: "VEVENT",
				allDay: false,
				transp: "OPAQUE",
				classification: "PUBLIC",
			});
		}
		setActiveStep(0);
	}, [event]);

	const handleSave = () => {
		if (!formData.summary || !formData.start) return;

		const savedEvent: CalendarEvent = {
			uid: formData.uid || generateUid(),
			type: formData.type || "VEVENT",
			summary: formData.summary,
			description: formData.description,
			location: formData.location,
			start: formData.start,
			end: formData.end,
			allDay: formData.allDay,
			status: formData.status,
			classification: formData.classification,
			transp: formData.transp,
			priority: formData.priority,
			categories: formData.categories,
			resources: formData.resources,
			url: formData.url,
			comment: formData.comment,
			contact: formData.contact,
			geo: formData.geo,
			organizer: formData.organizer,
			attendees: formData.attendees,
			rrule: formData.rrule,
			alarms: formData.alarms,
			due: formData.due,
			percentComplete: formData.percentComplete,
			sequence: (formData.sequence || 0) + 1,
			lastModified: new Date(),
		};

		onSave(savedEvent);
		onClose();
	};

	const handleDelete = () => {
		if (formData.uid && onDelete) {
			// Since we now always edit the original event, just pass the uid
			onDelete(formData.uid);
			onClose();
		}
	};

	const isEdit = Boolean(event?.uid);
	const isRecurringEvent = Boolean(formData.rrule);

	// Validation for each step
	const getStepError = (step: number): string | null => {
		switch (step) {
			case 0: // Basic Info
				if (!formData.summary?.trim()) return "Title is required";
				if (!formData.start) return "Start date/time is required";
				return null;
			case 1: // Details
				// No required fields in details step
				return null;
			case 2: // Participants
				// No required fields
				return null;
			case 3: // Reminders
				// No required fields
				return null;
			default:
				return null;
		}
	};

	const currentStepError = getStepError(activeStep);
	const canProceedFromCurrentStep = !currentStepError;
	const canSave = !getStepError(0); // Only check required fields for saving

	const nextStep = () => {
		if (!canProceedFromCurrentStep) return;
		setActiveStep((current) => (current < 3 ? current + 1 : current));
	};

	const prevStep = () => {
		setActiveStep((current) => (current > 0 ? current - 1 : current));
	};

	// Handle step click with validation
	const handleStepClick = (step: number) => {
		// Allow going back without validation
		if (step < activeStep) {
			setActiveStep(step);
			return;
		}
		// Validate all steps up to the target step
		for (let i = activeStep; i < step; i++) {
			const error = getStepError(i);
			if (error) {
				setActiveStep(i); // Stay on the step with error
				return;
			}
		}
		setActiveStep(step);
	};

	// Add attendee
	const addAttendee = () => {
		if (!newAttendeeEmail.trim()) return;
		const attendees = formData.attendees || [];
		if (attendees.some(a => a.email === newAttendeeEmail.trim())) return;

		setFormData(prev => ({
			...prev,
			attendees: [...attendees, {
				email: newAttendeeEmail.trim(),
				partstat: "NEEDS-ACTION",
				role: "REQ-PARTICIPANT"
			}],
		}));
		setNewAttendeeEmail("");
	};

	// Remove attendee
	const removeAttendee = (email: string) => {
		setFormData(prev => ({
			...prev,
			attendees: prev.attendees?.filter(a => a.email !== email),
		}));
	};

	// Add alarm
	const addAlarm = (trigger: string) => {
		const alarms = formData.alarms || [];
		if (alarms.some(a => a.trigger === trigger)) return;

		setFormData(prev => ({
			...prev,
			alarms: [...alarms, { action: "DISPLAY", trigger, description: formData.summary || "Reminder" }],
		}));
	};

	// Remove alarm
	const removeAlarm = (index: number) => {
		setFormData(prev => ({
			...prev,
			alarms: prev.alarms?.filter((_, i) => i !== index),
		}));
	};

	// Toggle recurrence
	const toggleRecurrence = (enabled: boolean) => {
		if (enabled) {
			setFormData(prev => ({
				...prev,
				rrule: { freq: "WEEKLY", interval: 1 },
			}));
		} else {
			setFormData(prev => ({
				...prev,
				rrule: undefined,
			}));
		}
	};

	return (
		<Modal
			opened={opened}
			onClose={onClose}
			title={<Text fw={600} size="lg">{isEdit ? "Edit Event" : "New Event"}</Text>}
			size="xl"
			centered
			aria-labelledby={`${formId}-title`}
		>
			{/* Notice for recurring events */}
			{isEdit && isRecurringEvent && (
				<Paper p="xs" mb="md" withBorder bg="blue.0" style={{ borderColor: "var(--mantine-color-blue-3)" }}>
					<Group gap="xs">
						<Icon icon="repeat" width={14} height={14} title="Recurring event" stroke="var(--mantine-color-blue-6)" />
						<Text size="sm" c="blue.8">
							This is a recurring event. Changes will apply to all occurrences.
						</Text>
					</Group>
				</Paper>
			)}

			<Stepper active={activeStep} onStepClick={handleStepClick} size="sm" mb="lg">
				<Stepper.Step label="Basic Info" description="Type, title, time">
					<Stack gap="md" mt="md">
						<Grid>
							<Grid.Col span={{ base: 12, sm: 6 }}>
								<Select
									label="Type"
									data={[
										{ value: "VEVENT", label: "Event" },
										{ value: "VTODO", label: "To-Do" },
										{ value: "VJOURNAL", label: "Journal Entry" },
									]}
									value={formData.type || "VEVENT"}
									onChange={(value) => setFormData((prev) => ({ ...prev, type: value as CalendarEvent["type"] }))}
								/>
							</Grid.Col>				<Grid.Col span={{ base: 12, sm: 6 }}>
								<TextInput
									label="Title"
									placeholder="Enter title"
									required
									value={formData.summary || ""}
									onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
								/>
							</Grid.Col>
						</Grid>
						<Checkbox
							label="All day event"
							checked={formData.allDay || false}
							onChange={(event) => {
								const checked = event.currentTarget?.checked ?? false;
								setFormData((prev) => ({ ...prev, allDay: checked }));
							}}
						/>

						<Grid>
							<Grid.Col span={{ base: 12, sm: 6 }}>
								{formData.allDay ? (
									<DateInput
										label="Start Date"
										required
										value={formData.start}
										onChange={(value) => setFormData((prev) => ({ ...prev, start: parsePickerDate(value) }))}
									/>
								) : (
									<DateTimePicker
										label="Start"
										required
										value={formData.start}
										onChange={(value) => setFormData((prev) => ({ ...prev, start: parsePickerDate(value) }))}
									/>
								)}
							</Grid.Col>
							<Grid.Col span={{ base: 12, sm: 6 }}>
								{formData.type !== "VTODO" ? (
									formData.allDay ? (
										<DateInput
											label="End Date"
											value={formData.end}
											onChange={(value) => setFormData((prev) => ({ ...prev, end: parsePickerDate(value) }))}
										/>
									) : (
										<DateTimePicker
											label="End"
											value={formData.end}
											onChange={(value) => setFormData((prev) => ({ ...prev, end: parsePickerDate(value) }))}
										/>
									)
								) : (
									<DateTimePicker
										label="Due"
										value={formData.due}
										onChange={(value) => setFormData((prev) => ({ ...prev, due: parsePickerDate(value) }))}
									/>
								)}
							</Grid.Col>
						</Grid>

						<Divider label="Recurrence" labelPosition="left" />

						<Switch
							label="Repeat this event"
							checked={Boolean(formData.rrule)}
							onChange={(e) => toggleRecurrence(e.currentTarget.checked)}
						/>

						{formData.rrule && (
							<Grid>
								{/* Repeat every X [days/weeks/months/years] */}
								<Grid.Col span={{ base: 12, sm: 6 }}>
									<InputLabel component='div' >Repeat every</InputLabel>
									<Group gap="sm" align="flex-end">
										<NumberInput
											min={1}
											max={99}
											w={70}
											value={formData.rrule.interval || 1}
											onChange={(value) => setFormData((prev) => ({
												...prev,
												rrule: { ...prev.rrule!, interval: typeof value === "number" ? value : 1 },
											}))}
										/>
										<Select
											w={120}
											data={[
												{ value: "DAILY", label: (formData.rrule.interval || 1) === 1 ? "day" : "days" },
												{ value: "WEEKLY", label: (formData.rrule.interval || 1) === 1 ? "week" : "weeks" },
												{ value: "MONTHLY", label: (formData.rrule.interval || 1) === 1 ? "month" : "months" },
												{ value: "YEARLY", label: (formData.rrule.interval || 1) === 1 ? "year" : "years" },
											]}
											value={formData.rrule.freq}
											onChange={(value) => setFormData((prev) => ({
												...prev,
												rrule: { ...prev.rrule!, freq: value as RecurrenceRule["freq"] },
											}))}
										/>
									</Group>
								</Grid.Col>
								{formData.rrule.freq === "WEEKLY" ? (
									<Grid.Col span={{ base: 12, sm: 6 }}>
										<MultiSelect
											label="On days"
											data={WEEKDAYS}
											value={formData.rrule.byDay || []}
											onChange={(value) => setFormData((prev) => ({
												...prev,
												rrule: { ...prev.rrule!, byDay: value },
											}))}
										/>
									</Grid.Col>
								) : (
									<Grid.Col span={{ base: 12, sm: 6 }}>
										<Space />
									</Grid.Col>
								)}
								<Grid.Col span={{ base: 12, sm: 6 }}>
									<NumberInput
										label="End after (occurrences)"
										min={1}
										placeholder="Forever"
										value={formData.rrule.count}
										onChange={(value) => setFormData((prev) => ({
											...prev,
											rrule: { ...prev.rrule!, count: typeof value === "number" ? value : undefined },
										}))}
									/>
								</Grid.Col>
								<Grid.Col span={{ base: 12, sm: 6 }}>
									<DateInput
										label="End by date"
										placeholder="Forever"
										value={formData.rrule.until}
										onChange={(value) => setFormData((prev) => ({
											...prev,
											rrule: { ...prev.rrule!, until: parsePickerDate(value) },
										}))}
										clearable
									/>
								</Grid.Col>
							</Grid>
						)}

						<Divider label="Status" labelPosition="left" />

						<Grid>
							<Grid.Col span={{ base: 12, sm: 6 }}>
								<Select
									label="Status"
									data={
										formData.type === "VTODO"
											? [
												{ value: "NEEDS-ACTION", label: "Needs Action" },
												{ value: "IN-PROCESS", label: "In Progress" },
												{ value: "COMPLETED", label: "Completed" },
												{ value: "CANCELLED", label: "Cancelled" },
											]
											: formData.type === "VJOURNAL"
												? [
													{ value: "DRAFT", label: "Draft" },
													{ value: "FINAL", label: "Final" },
													{ value: "CANCELLED", label: "Cancelled" },
												]
												: [
													{ value: "TENTATIVE", label: "Tentative" },
													{ value: "CONFIRMED", label: "Confirmed" },
													{ value: "CANCELLED", label: "Cancelled" },
												]
									}
									value={formData.status || ""}
									onChange={(value) => setFormData((prev) => ({ ...prev, status: value as CalendarEvent["status"] || undefined }))}
									clearable
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 12, sm: 6 }}>
								{formData.type === "VEVENT" && (
									<Select
										label="Show as"
										data={[
											{ value: "OPAQUE", label: "Busy" },
											{ value: "TRANSPARENT", label: "Free" },
										]}
										value={formData.transp || "OPAQUE"}
										onChange={(value) => setFormData((prev) => ({ ...prev, transp: value as "OPAQUE" | "TRANSPARENT" }))}
									/>
								)}
							</Grid.Col>
						</Grid>

						{formData.type === "VTODO" && (
							<Grid>
								<Grid.Col span={{ base: 12, sm: 6 }}>
									<NumberInput
										label="Priority (1=High, 9=Low)"
										min={1}
										max={9}
										value={formData.priority}
										onChange={(value) => setFormData((prev) => ({ ...prev, priority: typeof value === "number" ? value : undefined }))}
									/>
								</Grid.Col>
								<Grid.Col span={{ base: 12, sm: 6 }}>
									<NumberInput
										label="% Complete"
										min={0}
										max={100}
										suffix="%"
										value={formData.percentComplete}
										onChange={(value) => setFormData((prev) => ({ ...prev, percentComplete: typeof value === "number" ? value : undefined }))}
									/>
								</Grid.Col>
							</Grid>
						)}
					</Stack>
				</Stepper.Step>

				<Stepper.Step label="Details" description="Location, description">
					<Stack gap="md" mt="md">
						<Textarea
							label="Description"
							placeholder="Enter description (optional)"
							rows={4}
							value={formData.description || ""}
							onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
						/>

						<TextInput
							label="URL"
							placeholder="https://..."
							type="url"
							value={formData.url || ""}
							onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
						/>

						<Grid>
							<Grid.Col span={{ base: 12, sm: 6 }}>
								<TextInput
									label="Categories"
									placeholder="work, meeting, important"
									description="Comma-separated (press Tab or click away to apply)"
									defaultValue={formData.categories?.join(", ") || ""}
									key={`categories-${event?.uid || 'new'}`}
									onBlur={(e) => setFormData((prev) => ({
										...prev,
										categories: e.target.value.split(",").map((c) => c.trim()).filter(Boolean),
									}))}
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 12, sm: 6 }}>
								<TextInput
									label="Resources"
									placeholder="projector, whiteboard"
									description="Comma-separated (press Tab or click away to apply)"
									defaultValue={formData.resources?.join(", ") || ""}
									key={`resources-${event?.uid || 'new'}`}
									onBlur={(e) => setFormData((prev) => ({
										...prev,
										resources: e.target.value.split(",").map((c) => c.trim()).filter(Boolean),
									}))}
								/>
							</Grid.Col>
						</Grid>

						<Divider label="Geographic Location" labelPosition="left" />

						<TextInput
							label="Location"
							placeholder="Enter location (optional)"
							value={formData.location || ""}
							onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
						/>

						<Grid>
							<Grid.Col span={{ base: 12, sm: 6 }}>
								<NumberInput
									label="Latitude"
									decimalScale={6}
									placeholder="-90 to 90"
									value={formData.geo?.lat}
									onChange={(value) => setFormData((prev) => ({
										...prev,
										geo: typeof value === "number"
											? { lat: value, lon: prev.geo?.lon || 0 }
											: prev.geo,
									}))}
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 12, sm: 6 }}>
								<NumberInput
									label="Longitude"
									decimalScale={6}
									placeholder="-180 to 180"
									value={formData.geo?.lon}
									onChange={(value) => setFormData((prev) => ({
										...prev,
										geo: typeof value === "number"
											? { lat: prev.geo?.lat || 0, lon: value }
											: prev.geo,
									}))}
								/>
							</Grid.Col>
						</Grid>

					</Stack>
				</Stepper.Step>

				<Stepper.Step label="Participants" description="Organizer, attendees">
					<Stack gap="md" mt="md">
						<Grid>
							<Grid.Col span={{ base: 12, sm: 6 }}>
								<TextInput
									label="Contact"
									placeholder="Contact person or info"
									value={formData.contact || ""}
									onChange={(e) => setFormData((prev) => ({ ...prev, contact: e.target.value }))}
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 12, sm: 6 }}>
								<Select
									label="Classification"
									data={[
										{ value: "PUBLIC", label: "Public" },
										{ value: "PRIVATE", label: "Private" },
										{ value: "CONFIDENTIAL", label: "Confidential" },
									]}
									value={formData.classification || "PUBLIC"}
									onChange={(value) => setFormData((prev) => ({ ...prev, classification: value as CalendarEvent["classification"] }))}
								/>
							</Grid.Col>
						</Grid>

						<Divider label="Organizer" labelPosition="left" />

						<Grid>
							<Grid.Col span={{ base: 12, sm: 6 }}>
								<TextInput
									label="Organizer Name"
									placeholder="Your name"
									value={formData.organizer?.name || ""}
									onChange={(e) => setFormData((prev) => ({
										...prev,
										organizer: { ...prev.organizer, email: prev.organizer?.email || "", name: e.target.value },
									}))}
								/>
							</Grid.Col>
							<Grid.Col span={{ base: 12, sm: 6 }}>
								<TextInput
									label="Organizer Email"
									placeholder="your@email.com"
									type="email"
									value={formData.organizer?.email || ""}
									onChange={(e) => setFormData((prev) => ({
										...prev,
										organizer: { ...prev.organizer, email: e.target.value, name: prev.organizer?.name },
									}))}
								/>
							</Grid.Col>
						</Grid>

						<Divider label="Attendees" labelPosition="left" />

						<Group>
							<TextInput
								placeholder="attendee@email.com"
								type="email"
								value={newAttendeeEmail}
								onChange={(e) => setNewAttendeeEmail(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addAttendee();
									}
								}}
								style={{ flex: 1 }}
							/>
							<Button onClick={addAttendee} variant="light">Add</Button>
						</Group>

						{formData.attendees && formData.attendees.length > 0 && (
							<Stack gap="xs">
								{formData.attendees.map((att) => (
									<Paper key={att.email} p="xs" withBorder>
										<Group justify="space-between" wrap="nowrap">
											<Box style={{ flex: 1 }}>
												<Text size="sm" fw={500}>{att.name || att.email}</Text>
												{att.name && <Text size="xs" c="dimmed">{att.email}</Text>}
											</Box>
											<Group gap="xs">
												<Select
													size="xs"
													value={att.role || "REQ-PARTICIPANT"}
													data={[
														{ value: "CHAIR", label: "Chair" },
														{ value: "REQ-PARTICIPANT", label: "Required" },
														{ value: "OPT-PARTICIPANT", label: "Optional" },
														{ value: "NON-PARTICIPANT", label: "FYI" },
													]}
													onChange={(value) => setFormData((prev) => ({
														...prev,
														attendees: prev.attendees?.map(a =>
															a.email === att.email
																? { ...a, role: value as CalendarAttendee["role"] }
																: a
														),
													}))}
													style={{ width: 110 }}
												/>
												<Select
													size="xs"
													value={att.partstat || "NEEDS-ACTION"}
													data={[
														{ value: "NEEDS-ACTION", label: "Pending" },
														{ value: "ACCEPTED", label: "Accepted" },
														{ value: "DECLINED", label: "Declined" },
														{ value: "TENTATIVE", label: "Tentative" },
													]}
													onChange={(value) => setFormData((prev) => ({
														...prev,
														attendees: prev.attendees?.map(a =>
															a.email === att.email
																? { ...a, partstat: value as CalendarAttendee["partstat"] }
																: a
														),
													}))}
													style={{ width: 100 }}
												/>
												<CloseButton size="sm" onClick={() => removeAttendee(att.email)} />
											</Group>
										</Group>
									</Paper>
								))}
							</Stack>
						)}

						{(!formData.attendees || formData.attendees.length === 0) && (
							<Text size="sm" c="dimmed" ta="center" py="md">
								No attendees added yet
							</Text>
						)}
					</Stack>
				</Stepper.Step>

				<Stepper.Step label="Reminders" description="Alarms, notifications">
					<Stack gap="md" mt="md">
						<Text size="sm" c="dimmed">
							Add reminders to be notified before the event.
						</Text>

						<Select
							label="Add a reminder"
							placeholder="Select timing"
							data={ALARM_PRESETS}
							value=""
							onChange={(value) => value && addAlarm(value)}
							clearable
						/>

						{formData.alarms && formData.alarms.length > 0 && (
							<Stack gap="xs">
								{formData.alarms.map((alarm, index) => (
									<Paper key={index} p="xs" withBorder>
										<Group justify="space-between" wrap="nowrap">
											<Group gap="xs">
												<Badge variant="light" size="sm">
													{alarm.action}
												</Badge>
												<Text size="sm">{formatAlarmTrigger(alarm.trigger)}</Text>
											</Group>
											<CloseButton size="sm" onClick={() => removeAlarm(index)} />
										</Group>
									</Paper>
								))}
							</Stack>
						)}

						{(!formData.alarms || formData.alarms.length === 0) && (
							<Paper p="lg" withBorder ta="center">
								<Text size="sm" c="dimmed">
									No reminders set
								</Text>
							</Paper>
						)}
					</Stack>
				</Stepper.Step>
			</Stepper>

			<Divider my="md" />

			{/* Show validation error if any */}
			{currentStepError && (
				<Group gap="xs" mb="md">
					<Icon icon="alert-circle" width={16} height={16} title="Error" stroke="var(--mantine-color-red-6)" />
					<Text size="sm" c="red">{currentStepError}</Text>
				</Group>
			)}

			<Group justify="space-between">
				{isEdit && onDelete ? (
					<Button color="red" variant="light" onClick={handleDelete}>Delete</Button>
				) : <Box />}

				<Group>
					{activeStep > 0 && (
						<Button variant="default" onClick={prevStep}>Back</Button>
					)}
					{activeStep < 3 && (
						<Button variant="light" onClick={nextStep} disabled={!canProceedFromCurrentStep}>
							Next
						</Button>
					)}
					<Button onClick={handleSave} disabled={!canSave}>
						{isEdit ? "Update" : "Create"}
					</Button>
				</Group>
			</Group>
		</Modal>
	);
}

// Helper function to calculate duration
function formatDuration(start: Date, end: Date): string {
	const diffMs = end.getTime() - start.getTime();
	const diffMins = Math.round(diffMs / (1000 * 60));

	if (diffMins < 60) {
		return `${diffMins}m`;
	}

	const hours = Math.floor(diffMins / 60);
	const mins = diffMins % 60;

	if (hours < 24) {
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	}

	const days = Math.floor(hours / 24);
	const remainingHours = hours % 24;
	return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

// Format recurrence rule for display
function formatRecurrence(rrule: RecurrenceRule): string {
	const interval = rrule.interval || 1;
	const unit = FREQ_UNITS[rrule.freq] || { singular: "time", plural: "times" };
	const unitLabel = interval === 1 ? unit.singular : unit.plural;

	let text = interval === 1 ? `Every ${unitLabel}` : `Every ${interval} ${unitLabel}`;

	if (rrule.byDay?.length) {
		text += ` on ${rrule.byDay.join(", ")}`;
	}

	if (rrule.count) {
		text += ` (${rrule.count}×)`;
	} else if (rrule.until) {
		text += ` until ${formatDate(rrule.until, "MMM DD")}`;
	}

	return text;
}

// Rich Event Card with minimal format
function EventCard({
	event,
	onClick,
	compact = false,
}: {
	event: CalendarEvent;
	onClick: () => void;
	compact?: boolean;
}) {
	const eventDate = new Date(event.start);
	const endDate = event.end ? new Date(event.end) : null;
	const duration = endDate && !event.allDay ? formatDuration(eventDate, endDate) : null;
	const attendeeCount = event.attendees?.length || 0;
	const alarmCount = event.alarms?.length || 0;

	return (
		<Card
			shadow="sm"
			padding={compact ? "sm" : "md"}
			withBorder
			className={styles.eventCard}
			onClick={onClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick();
				}
			}}
			role="button"
			tabIndex={0}
			aria-label={`${event.summary}, ${formatDate(eventDate, "MMMM DD")}`}
		>
			{/* Header with type and status badges */}
			<Group justify="space-between" wrap="nowrap" gap="xs" mb={compact ? 4 : "xs"}>
				<Group gap={4}>
					<Badge color={getEventTypeColor(event.type)} variant="light" size="xs">
						{getEventTypeLabel(event.type)}
					</Badge>
					{event.type === "VTODO" && event.priority && event.priority <= 3 && (
						<Badge color="red" variant="light" size="xs">High</Badge>
					)}
					{event.rrule && (
						<Tooltip
							label={`${formatRecurrence(event.rrule)}${event._isRecurrenceInstance ? " • Click to edit all occurrences" : ""}`}
							withArrow
							multiline
							w={200}
						>
							<Badge color="violet" variant="light" size="xs" leftSection={<Icon icon="repeat" width={10} height={10} title="Recurring" />}>
								Repeat
							</Badge>
						</Tooltip>
					)}
					{event.transp === "TRANSPARENT" && (
						<Badge color="gray" variant="outline" size="xs">Free</Badge>
					)}
				</Group>
				<Group gap={4}>
					{event.classification === "PRIVATE" && (
						<Badge color="gray" variant="light" size="xs" leftSection={<Icon icon="lock" width={10} height={10} title="Private" />}>
							Private
						</Badge>
					)}
					{event.status && (
						<Badge color={getEventStatusColor(event.status)} variant="dot" size="xs">
							{event.status.toLowerCase().replace("-", " ")}
						</Badge>
					)}
				</Group>
			</Group>

			{/* Title */}
			<Text fw={600} size={compact ? "sm" : "md"} lineClamp={1} mb={4}>
				{event.summary}
			</Text>

			{/* Time and duration row */}
			<Group gap="xs" wrap="nowrap">
				<Text size="xs" c="dimmed">
					{event.allDay ? "All day" : formatTime(eventDate)}
					{endDate && !event.allDay && ` – ${formatTime(endDate)}`}
				</Text>
				{duration && (
					<Badge size="xs" variant="outline" color="gray">
						{duration}
					</Badge>
				)}
			</Group>

			{/* Location - always show if present */}
			{event.location && (
				<Group gap={4} mt={4}>
					<Icon icon="map-pin" width={12} height={12} title="Location" />
					<Text size="xs" c="dimmed" lineClamp={1}>{event.location}</Text>
				</Group>
			)}

			{/* Description - only in expanded mode */}
			{!compact && event.description && (
				<Text size="xs" c="dimmed" lineClamp={2} mt={4}>
					{event.description}
				</Text>
			)}

			{/* Info indicators row */}
			<Group gap="xs" mt={6}>
				{/* Attendees indicator */}
				{attendeeCount > 0 && (
					<Tooltip label={`${attendeeCount} participant${attendeeCount !== 1 ? "s" : ""}`} withArrow>
						<Badge size="xs" variant="light" color="teal" leftSection={<Icon icon="users" width={10} height={10} title="Attendees" />}>
							{attendeeCount}
						</Badge>
					</Tooltip>
				)}

				{/* Alarm indicator */}
				{alarmCount > 0 && (
					<Tooltip label={`${alarmCount} reminder${alarmCount !== 1 ? "s" : ""}`} withArrow>
						<Badge size="xs" variant="light" color="yellow" leftSection={<Icon icon="bell" width={10} height={10} title="Reminders" />}>
							{alarmCount}
						</Badge>
					</Tooltip>
				)}

				{/* URL indicator */}
				{event.url && (
					<Badge size="xs" variant="light" color="blue" leftSection={<Icon icon="link" width={10} height={10} title="Link" />}>
						Link
					</Badge>
				)}

				{/* Attachments indicator */}
				{event.attachments && event.attachments.length > 0 && (
					<Badge size="xs" variant="light" color="gray" leftSection={<Icon icon="paperclip" width={10} height={10} title="Attachments" />}>
						{event.attachments.length}
					</Badge>
				)}
			</Group>

			{/* Categories as small tags */}
			{event.categories && event.categories.length > 0 && (
				<Group gap={4} mt={6}>
					{event.categories.slice(0, compact ? 2 : 4).map((cat) => (
						<Badge key={cat} size="xs" variant="default" color="gray">
							{cat}
						</Badge>
					))}
					{event.categories.length > (compact ? 2 : 4) && (
						<Text size="xs" c="dimmed">+{event.categories.length - (compact ? 2 : 4)}</Text>
					)}
				</Group>
			)}

			{/* Organizer - only in expanded mode */}
			{!compact && event.organizer && (
				<Text size="xs" c="dimmed" mt={4}>
					Organizer: {event.organizer.name || event.organizer.email}
				</Text>
			)}

			{/* To-Do progress bar */}
			{event.type === "VTODO" && event.percentComplete !== undefined && (
				<Box mt="xs">
					<Group justify="space-between" mb={2}>
						<Text size="xs" c="dimmed">Progress</Text>
						<Text size="xs" c="dimmed">{event.percentComplete}%</Text>
					</Group>
					<Box
						style={{
							height: 4,
							backgroundColor: "var(--mantine-color-gray-3)",
							borderRadius: 2,
							overflow: "hidden",
						}}
					>
						<Box
							style={{
								height: "100%",
								width: `${event.percentComplete}%`,
								backgroundColor: event.percentComplete === 100
									? "var(--mantine-color-green-6)"
									: "var(--mantine-color-blue-6)",
								transition: "width 0.3s ease",
							}}
						/>
					</Box>
				</Box>
			)}

			{/* Due date for To-Dos */}
			{event.type === "VTODO" && event.due && (
				<Text size="xs" c="orange" mt={4}>
					Due: {formatDate(new Date(event.due), "MMM DD")} at {formatTime(new Date(event.due))}
				</Text>
			)}
		</Card>
	);
}

// Calendar View - Calendar on left, selected date events on right
function CalendarView({
	events,
	selectedDate,
	onDateSelect,
	onEventClick,
	onNewEvent,
	readOnly,
}: {
	events: CalendarEvent[];
	selectedDate: Date;
	onDateSelect: (date: Date) => void;
	onEventClick: (event: CalendarEvent) => void;
	onNewEvent: (date: Date) => void;
	readOnly: boolean;
}) {
	const isMobile = useMediaQuery("(max-width: 768px)");

	// Expand recurring events for a 2-year window (1 year back, 1 year forward)
	const expandedEvents = useMemo(() => {
		const now = new Date();
		const rangeStart = new Date(now.getFullYear() - 1, 0, 1);
		const rangeEnd = new Date(now.getFullYear() + 1, 11, 31);
		return expandRecurringEvents(events, rangeStart, rangeEnd);
	}, [events]);

	// Get dates with events for indicators
	const datesWithEvents = useMemo(() => {
		const dates = new Set<string>();
		for (const event of expandedEvents) {
			const d = new Date(event.start);
			dates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
		}
		return dates;
	}, [expandedEvents]);

	// Events for selected date (using expanded events)
	const selectedDateEvents = useMemo(() => {
		const dayStart = getStartOfDay(selectedDate);
		const dayEnd = getEndOfDay(selectedDate);
		return expandedEvents
			.filter(event => {
				const eventStart = new Date(event.start);
				const eventEnd = event.end ? new Date(event.end) : eventStart;
				return eventStart <= dayEnd && eventEnd >= dayStart;
			})
			.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
	}, [expandedEvents, selectedDate]);

	const handleDateChange = (dateStr: string | null) => {
		if (dateStr) {
			const date = new Date(dateStr);
			if (!Number.isNaN(date.getTime())) {
				onDateSelect(date);
			}
		}
	};

	const today = new Date();
	const isSelectedToday = isSameDay(selectedDate, today);

	return (
		<Box className={styles.calendarViewContainer}>
			<Grid gutter="lg" align="flex-start">
				{/* Calendar Panel */}
				<Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
					<Paper p="md" withBorder className={styles.calendarPanel}>
						<Calendar
							w='fit-content'
							mx='auto'
							date={selectedDate}
							onDateChange={handleDateChange}
							size={isMobile ? "sm" : "md"}
							getDayProps={(dateStr) => {
								const dateObj = new Date(dateStr);
								const dateKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
								const hasEvents = datesWithEvents.has(dateKey);
								const isSelected = isSameDay(dateObj, selectedDate);

								return {
									selected: isSelected,
									onClick: () => handleDateChange(dateStr),
									style: hasEvents && !isSelected ? {
										backgroundColor: "var(--mantine-color-blue-light)",
									} : undefined,
								};
							}}
							aria-label="Select a date"
						/>

						{/* Summary */}
						<Divider my="md" />
						<Group gap="xs" justify="center">
							<Badge color="blue" variant="light" size="sm">
								{events.filter(e => e.type === "VEVENT").length} Events
							</Badge>
							<Badge color="orange" variant="light" size="sm">
								{events.filter(e => e.type === "VTODO").length} To-Dos
							</Badge>
							<Badge color="grape" variant="light" size="sm">
								{events.filter(e => e.type === "VJOURNAL").length} Journals
							</Badge>
						</Group>
					</Paper>
				</Grid.Col>

				{/* Events Panel */}
				<Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
					<Box className={styles.eventsPanel}>
						<Group justify="space-between" mb="md" wrap="nowrap">
							<Box>
								<Title order={4}>
									{formatDate(selectedDate, "dddd, MMMM DD, YYYY")}
								</Title>
								{isSelectedToday && (
									<Badge color="blue" size="sm" mt={4}>Today</Badge>
								)}
							</Box>
							{!readOnly && (
								<Button
									size="xs"
									variant="light"
									leftSection={<Icon icon="plus" width={14} height={14} title="Add" />}
									onClick={() => onNewEvent(selectedDate)}
								>
									Add
								</Button>
							)}
						</Group>

						{selectedDateEvents.length === 0 ? (
							<Paper p="xl" withBorder ta="center">
								<Text c="dimmed" mb="sm">No events on this date</Text>
								{!readOnly && (
									<Button
										variant="subtle"
										size="sm"
										onClick={() => onNewEvent(selectedDate)}
									>
										Create an event
									</Button>
								)}
							</Paper>
						) : (
							<Stack gap="sm">
								{selectedDateEvents.map((event) => (
									<EventCard
										key={event.uid}
										event={event}
										onClick={() => onEventClick(event)}
									/>
								))}
							</Stack>
						)}
					</Box>
				</Grid.Col>
			</Grid>
		</Box>
	);
}

// List View - Timeline of events within ±1 day window with load more
function ListView({
	events,
	onEventClick,
	onNewEvent,
	readOnly,
}: {
	events: CalendarEvent[];
	onEventClick: (event: CalendarEvent) => void;
	onNewEvent: () => void;
	readOnly: boolean;
}) {
	// Flags to show all past or future events
	const [showAllPast, setShowAllPast] = useState(false);
	const [showAllFuture, setShowAllFuture] = useState(false);

	const today = new Date();
	const todayStart = getStartOfDay(today);

	// Expand recurring events for the view range
	const expandedEvents = useMemo(() => {
		// Expand for a reasonable range: 1 year back to 1 year forward
		const now = new Date();
		const rangeStart = new Date(now.getFullYear() - 1, 0, 1);
		const rangeEnd = new Date(now.getFullYear() + 1, 11, 31);
		return expandRecurringEvents(events, rangeStart, rangeEnd);
	}, [events]);

	// Calculate date range boundaries (default: yesterday to tomorrow)
	const { visibleEvents, pastEventsCount, futureEventsCount } = useMemo(() => {
		// Default window: 1 day before to 1 day after today
		const defaultStart = new Date(todayStart.getTime() - 1 * 24 * 60 * 60 * 1000);
		const defaultEnd = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 to include end of tomorrow

		const sorted = [...expandedEvents].sort(
			(a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
		);

		const visible: CalendarEvent[] = [];
		let pastCount = 0;
		let futureCount = 0;

		for (const event of sorted) {
			const eventDate = new Date(event.start);
			const isBeforeWindow = eventDate < defaultStart;
			const isAfterWindow = eventDate >= defaultEnd;

			if (isBeforeWindow) {
				pastCount++;
				if (showAllPast) {
					visible.push(event);
				}
			} else if (isAfterWindow) {
				futureCount++;
				if (showAllFuture) {
					visible.push(event);
				}
			} else {
				// Within default window - always show
				visible.push(event);
			}
		}

		// Re-sort after adding past/future events
		visible.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

		return {
			visibleEvents: visible,
			pastEventsCount: pastCount,
			futureEventsCount: futureCount,
		};
	}, [expandedEvents, showAllPast, showAllFuture, todayStart]);

	// Group by date for timeline display
	const groupedByDate = useMemo(() => {
		const groups: { date: Date; events: CalendarEvent[] }[] = [];
		let currentGroup: { date: Date; events: CalendarEvent[] } | null = null;

		for (const event of visibleEvents) {
			const eventDate = new Date(event.start);

			if (!currentGroup || formatDate(currentGroup.date, "YYYY-MM-DD") !== formatDate(eventDate, "YYYY-MM-DD")) {
				currentGroup = { date: eventDate, events: [] };
				groups.push(currentGroup);
			}
			currentGroup.events.push(event);
		}

		return groups;
	}, [visibleEvents]);

	// Toggle showing all past events
	const togglePastEvents = () => {
		setShowAllPast(prev => !prev);
	};

	// Toggle showing all future events
	const toggleFutureEvents = () => {
		setShowAllFuture(prev => !prev);
	};

	if (events.length === 0) {
		return (
			<Center py="xl">
				<Stack align="center" gap="md">
					<Text c="dimmed" size="lg">No events yet</Text>
					{!readOnly && (
						<Button onClick={onNewEvent} leftSection={<Icon icon="plus" width={16} height={16} title="Add" />}>
							Create your first event
						</Button>
					)}
				</Stack>
			</Center>
		);
	}

	return (
		<Container size="md" py="md">
			<Group justify="space-between" mb="lg">
				<Box>
					<Title order={3}>Timeline</Title>
					<Text size="sm" c="dimmed">
						{showAllPast && showAllFuture
							? "Showing all events"
							: showAllPast
								? "Including all past events"
								: showAllFuture
									? "Including all future events"
									: "Yesterday, Today & Tomorrow"}
					</Text>
				</Box>
				{!readOnly && (
					<Button
						size="sm"
						leftSection={<Icon icon="plus" width={14} height={14} title="Add" />}
						onClick={onNewEvent}
					>
						Add Event
					</Button>
				)}
			</Group>

			{/* Load/Hide past events button */}
			{pastEventsCount > 0 && (
				<Button
					variant={showAllPast ? "light" : "subtle"}
					size="sm"
					fullWidth
					mb="md"
					onClick={togglePastEvents}
					leftSection={<Icon icon={showAllPast ? "chevron-down" : "chevron-up"} width={14} height={14} title="Toggle past" />}
				>
					{showAllPast
						? `Hide ${pastEventsCount} past event${pastEventsCount !== 1 ? "s" : ""}`
						: `Show all ${pastEventsCount} past event${pastEventsCount !== 1 ? "s" : ""}`
					}
				</Button>
			)}

			{visibleEvents.length === 0 ? (
				<Center py="xl">
					<Stack align="center" gap="md">
						<Text c="dimmed">No events in this time window</Text>
						<Group>
							{pastEventsCount > 0 && (
								<Button
									variant="light"
									size="sm"
									onClick={togglePastEvents}
								>
									Show past events
								</Button>
							)}
							{futureEventsCount > 0 && (
								<Button
									variant="light"
									size="sm"
									onClick={toggleFutureEvents}
								>
									Show future events
								</Button>
							)}
						</Group>
					</Stack>
				</Center>
			) : (
				<Timeline active={-1} bulletSize={12} lineWidth={2}>
					{groupedByDate.map((group) => {
						const isToday = isSameDay(group.date, today);
						const isPast = group.date < today && !isToday;
						const isTomorrow = isSameDay(group.date, new Date(today.getTime() + 24 * 60 * 60 * 1000));
						const isYesterday = isSameDay(group.date, new Date(today.getTime() - 24 * 60 * 60 * 1000));

						let dayLabel = "";
						if (isToday) dayLabel = "Today";
						else if (isTomorrow) dayLabel = "Tomorrow";
						else if (isYesterday) dayLabel = "Yesterday";

						return (
							<Timeline.Item
								key={formatDate(group.date, "YYYY-MM-DD")}
								color={isToday ? "blue" : isPast ? "gray" : "blue.4"}
								title={
									<Group gap="xs" mb="xs">
										<Text fw={600} size="lg">
											{formatDate(group.date, "dddd, MMMM DD, YYYY")}
										</Text>
										{dayLabel && <Badge color={isToday ? "blue" : isPast ? "gray" : "cyan"} size="sm">{dayLabel}</Badge>}
									</Group>
								}
								className={isPast ? styles.timelinePast : ""}
							>
								<Stack gap="sm" mt="xs">
									{group.events.map((event) => (
										<EventCard
											key={event.uid}
											event={event}
											onClick={() => onEventClick(event)}
											compact
										/>
									))}
								</Stack>
							</Timeline.Item>
						);
					})}
				</Timeline>
			)}

			{/* Load/Hide future events button */}
			{futureEventsCount > 0 && (
				<Button
					variant={showAllFuture ? "light" : "subtle"}
					size="sm"
					fullWidth
					mt="md"
					onClick={toggleFutureEvents}
					rightSection={<Icon icon={showAllFuture ? "chevron-up" : "chevron-down"} width={14} height={14} title="Toggle future" />}
				>
					{showAllFuture
						? `Hide ${futureEventsCount} future event${futureEventsCount !== 1 ? "s" : ""}`
						: `Show all ${futureEventsCount} future event${futureEventsCount !== 1 ? "s" : ""}`
					}
				</Button>
			)}

			{/* Summary of current view */}
			<Paper p="sm" mt="md" withBorder>
				<Group justify="center" gap="lg">
					<Text size="xs" c="dimmed">
						Showing {visibleEvents.length} of {expandedEvents.length} events
					</Text>
					{(showAllPast || showAllFuture) && (
						<Button
							variant="subtle"
							size="xs"
							onClick={() => {
								setShowAllPast(false);
								setShowAllFuture(false);
							}}
						>
							Reset to ±1 day
						</Button>
					)}
				</Group>
			</Paper>
		</Container>
	);
}

// Main Editor Component
export default function EditorCalendar({
	defaultValue,
	onChange,
	readOnly = false,
}: EditorCalendarProps) {
	const [calendarData, setCalendarData] = useState<CalendarData>(defaultValue);
	const [viewMode, setViewMode] = useState<ViewMode>("calendar");
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
	const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

	const editorId = useId();

	const handleDataChange = useCallback(
		(newData: CalendarData) => {
			setCalendarData(newData);
			onChange?.(newData);
		},
		[onChange]
	);

	const handleEventClick = useCallback(
		(event: CalendarEvent) => {
			if (readOnly) return;

			// If this is a recurring instance, find and edit the ORIGINAL event
			// This ensures we edit the recurrence rule, not a specific instance
			const eventToEdit = findOriginalEvent(event, calendarData.events);
			setEditingEvent(eventToEdit);
			openModal();
		},
		[readOnly, openModal, calendarData.events]
	);

	const handleNewEvent = useCallback(
		(startDate?: Date) => {
			const start = startDate || selectedDate || new Date();
			const newEvent = createNewEvent({
				start,
				end: new Date(start.getTime() + 60 * 60 * 1000),
			});
			setEditingEvent(newEvent);
			openModal();
		},
		[openModal, selectedDate]
	);

	const handleSaveEvent = useCallback(
		(event: CalendarEvent) => {
			// The event being saved should already be the original (not an instance)
			// since handleEventClick now finds the original event before opening modal.
			// But we still clean up internal properties just in case.
			const eventToSave: CalendarEvent = {
				...event,
			};
			// Remove internal tracking properties (shouldn't be present, but be safe)
			delete eventToSave._originalUid;
			delete eventToSave._isRecurrenceInstance;

			const existingIndex = calendarData.events.findIndex((e) => e.uid === eventToSave.uid);
			let newEvents: CalendarEvent[];

			if (existingIndex >= 0) {
				// Update existing event
				newEvents = [...calendarData.events];
				newEvents[existingIndex] = eventToSave;
			} else {
				// Add new event
				newEvents = [...calendarData.events, eventToSave];
			}

			handleDataChange({ ...calendarData, events: newEvents });
		},
		[calendarData, handleDataChange]
	);

	const handleDeleteEvent = useCallback(
		(uid: string, originalUid?: string) => {
			// Determine which UID to delete
			// If originalUid is provided, use that (for recurring instances)
			// If the uid contains our recurrence marker, extract the original UID
			let uidToDelete = originalUid || uid;

			// Check for our recurrence instance marker pattern: "originalUid__RECURRENCE__timestamp"
			const recurrenceMarkerIndex = uidToDelete.indexOf("__RECURRENCE__");
			if (recurrenceMarkerIndex > -1) {
				uidToDelete = uidToDelete.substring(0, recurrenceMarkerIndex);
			}

			const newEvents = calendarData.events.filter((e) => e.uid !== uidToDelete);
			handleDataChange({ ...calendarData, events: newEvents });
		},
		[calendarData, handleDataChange]
	);

	return (
		<Box className={styles.editorCalendar} id={editorId}>
			{/* Toolbar */}
			<Paper className={styles.toolbar} p="sm" withBorder>
				<Flex justify="space-between" align="center" wrap="wrap" gap="sm">
					<SegmentedControl
						size="sm"
						value={viewMode}
						onChange={(value) => setViewMode(value as ViewMode)}
						data={[
							{ value: "calendar", label: "Calendar" },
							{ value: "list", label: "Timeline" },
						]}
					/>

					<Badge variant="light" size="lg">
						{calendarData.events.length} item{calendarData.events.length !== 1 ? "s" : ""}
					</Badge>
				</Flex>
			</Paper>

			{/* Content */}
			<ScrollArea scrollbars='y' className={styles.content}>
				{viewMode === "calendar" && (
					<CalendarView
						events={calendarData.events}
						selectedDate={selectedDate}
						onDateSelect={setSelectedDate}
						onEventClick={handleEventClick}
						onNewEvent={handleNewEvent}
						readOnly={readOnly}
					/>
				)}

				{viewMode === "list" && (
					<ListView
						events={calendarData.events}
						onEventClick={handleEventClick}
						onNewEvent={() => handleNewEvent()}
						readOnly={readOnly}
					/>
				)}
			</ScrollArea>

			{/* Event Editor Modal */}
			<EventEditorModal
				opened={modalOpened}
				onClose={closeModal}
				event={editingEvent}
				onSave={handleSaveEvent}
				onDelete={handleDeleteEvent}
			/>
		</Box>
	);
}

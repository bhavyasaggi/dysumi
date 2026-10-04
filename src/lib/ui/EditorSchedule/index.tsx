import { Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
	Schedule,
	type ScheduleEventData,
	type ScheduleRecurrenceData,
} from "@mantine/schedule";
import React, { useCallback, useMemo, useState } from "react";

import {
	type CalendarData,
	type CalendarEvent,
	createNewEvent,
} from "@/lib/utils/ics";
import { formatScheduleDate, parseScheduleDate } from "./dates";

import "@mantine/dates/styles.css";
import "@mantine/schedule/styles.css";

const EditorScheduleWizard = React.lazy(() => import("./Wizard"));

export interface EditorScheduleProps {
	defaultValue: CalendarData;
	onChange?: (data: CalendarData) => void;
	readOnly?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<CalendarEvent["type"], string> = {
	VEVENT: "blue",
	VTODO: "orange",
	VJOURNAL: "grape",
};

/** Convert CalendarEvent[] → ScheduleEventData[] for the Schedule component.
 *  Passes rruleString natively so Schedule handles recurrence expansion. */
function toScheduleEvents(events: CalendarEvent[]): ScheduleEventData[] {
	return events.map((ev) => {
		const startStr = formatScheduleDate(ev.start);
		const defaultDuration = ev.type === "VEVENT" ? 3_600_000 : 900_000;
		const endStr = ev.end
			? formatScheduleDate(ev.end)
			: formatScheduleDate(new Date(ev.start.getTime() + defaultDuration));

		const base = {
			id: ev.uid,
			title: ev.summary || "(untitled)",
			start: startStr,
			end: endStr,
			color: EVENT_COLORS[ev.type] || "blue",
			payload: { calendarEvent: ev },
		};

		if (ev.rruleString) {
			const recurrence: ScheduleRecurrenceData = {
				rrule: ev.rruleString,
				dtstart: startStr,
			};
			if (ev.exdate && ev.exdate.length > 0) {
				recurrence.exdate = ev.exdate.map((d) => formatScheduleDate(d));
			}
			return { ...base, recurrence } as ScheduleEventData;
		}

		return base as ScheduleEventData;
	});
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EditorSchedule({
	defaultValue,
	onChange,
	readOnly = false,
}: EditorScheduleProps) {
	const [calendarData, setCalendarData] = useState<CalendarData>(defaultValue);

	const [modalOpened, { open: openModal, close: closeModal }] =
		useDisclosure(false);
	const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
	const [isNewEvent, setIsNewEvent] = useState(false);

	const handleDataChange = useCallback(
		(newData: CalendarData) => {
			setCalendarData(newData);
			onChange?.(newData);
		},
		[onChange],
	);

	const scheduleEvents = useMemo(
		() => toScheduleEvents(calendarData.events),
		[calendarData.events],
	);

	const openNewEvent = useCallback(
		(partial: Partial<CalendarEvent>) => {
			if (readOnly) return;
			setEditingEvent(createNewEvent(partial));
			setIsNewEvent(true);
			openModal();
		},
		[readOnly, openModal],
	);

	// For recurring instances the eventId is "seriesId::recurrenceId";
	// updating the series source shifts all occurrences.
	const updateEventTimes = useCallback(
		({
			eventId,
			newStart,
			newEnd,
		}: {
			eventId: string | number;
			newStart: string;
			newEnd: string;
		}) => {
			if (readOnly) return;
			const seriesId = String(eventId).split("::")[0];
			const start = parseScheduleDate(newStart);
			const end = parseScheduleDate(newEnd);
			if (!(start && end)) return;
			const newEvents = calendarData.events.map((ev) =>
				ev.uid === seriesId
					? {
							...ev,
							start,
							end,
							lastModified: new Date(),
						}
					: ev,
			);
			handleDataChange({ ...calendarData, events: newEvents });
		},
		[readOnly, calendarData, handleDataChange],
	);

	const handleEventClick = useCallback(
		(scheduleEv: ScheduleEventData) => {
			if (readOnly) return;
			const sourceId =
				scheduleEv.recurringInstance?.recurringEventId ?? scheduleEv.id;
			const original = calendarData.events.find((e) => e.uid === sourceId);
			if (original) {
				setEditingEvent(original);
				setIsNewEvent(false);
				openModal();
			}
		},
		[readOnly, calendarData.events, openModal],
	);

	const openRange = useCallback(
		(startValue: string, endValue: string, allDay = false) => {
			const start = parseScheduleDate(startValue);
			const end = parseScheduleDate(endValue);
			if (!(start && end)) return;
			openNewEvent(allDay ? { start, end, allDay } : { start, end });
		},
		[openNewEvent],
	);
	const handleTimeSlotClick = useCallback(
		({ slotStart, slotEnd }: { slotStart: string; slotEnd: string }) =>
			openRange(slotStart, slotEnd),
		[openRange],
	);
	const handleSlotDragEnd = useCallback(
		(rangeStart: string, rangeEnd: string) => openRange(rangeStart, rangeEnd),
		[openRange],
	);

	const handleDayOrAllDayClick = useCallback(
		(dateStr: string) => {
			const start = parseScheduleDate(dateStr);
			if (!start) return;
			const end = new Date(start.getTime());
			end.setDate(end.getDate() + 1);
			openNewEvent({ start, end, allDay: true });
		},
		[openNewEvent],
	);

	const handleSaveEvent = useCallback(
		(event: CalendarEvent) => {
			const idx = calendarData.events.findIndex((e) => e.uid === event.uid);
			const newEvents = [...calendarData.events];
			if (idx >= 0) newEvents[idx] = event;
			else newEvents.push(event);
			handleDataChange({ ...calendarData, events: newEvents });
		},
		[calendarData, handleDataChange],
	);

	const handleDeleteEvent = useCallback(
		(uid: string) => {
			handleDataChange({
				...calendarData,
				events: calendarData.events.filter((e) => e.uid !== uid),
			});
		},
		[calendarData, handleDataChange],
	);
	const handleWizardSave = useCallback(
		(event: CalendarEvent) => {
			handleSaveEvent(event);
			closeModal();
		},
		[closeModal, handleSaveEvent],
	);
	const handleWizardDelete = useCallback(
		(uid: string) => {
			handleDeleteEvent(uid);
			closeModal();
		},
		[closeModal, handleDeleteEvent],
	);

	return (
		<>
			<Schedule
				h="100%"
				p="sm"
				events={scheduleEvents}
				defaultView="week"
				radius={0}
				layout="responsive"
				withAgenda
				mode={readOnly ? "static" : "default"}
				{...(!readOnly && {
					onEventClick: handleEventClick,
					onTimeSlotClick: handleTimeSlotClick,
					onAllDaySlotClick: handleDayOrAllDayClick,
					onDayClick: handleDayOrAllDayClick,
					onSlotDragEnd: handleSlotDragEnd,
					withDragSlotSelect: true,
					withEventsDragAndDrop: true,
					onEventDrop: updateEventTimes,
					withEventResize: true,
					onEventResize: updateEventTimes,
				})}
			/>
			<Modal
				opened={modalOpened}
				onClose={closeModal}
				title={isNewEvent ? "New Event" : "Edit Event"}
				size="xl"
				centered
			>
				<React.Suspense fallback={null}>
					<EditorScheduleWizard
						event={editingEvent}
						isNew={isNewEvent}
						onSave={handleWizardSave}
						onDelete={
							!isNewEvent && editingEvent?.uid ? handleWizardDelete : undefined
						}
					/>
				</React.Suspense>
			</Modal>
		</>
	);
}

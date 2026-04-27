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

/** Format a JS Date to `YYYY-MM-DD HH:mm:ss`. */
function fmtDateTime(d: Date): string {
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Convert CalendarEvent[] → ScheduleEventData[] for the Schedule component.
 *  Passes rruleString natively so Schedule handles recurrence expansion. */
function toScheduleEvents(events: CalendarEvent[]): ScheduleEventData[] {
	return events.map((ev) => {
		const startStr = fmtDateTime(ev.start);
		const defaultDuration = ev.type === "VEVENT" ? 3_600_000 : 900_000;
		const endStr = ev.end
			? fmtDateTime(ev.end)
			: fmtDateTime(new Date(ev.start.getTime() + defaultDuration));

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
				recurrence.exdate = ev.exdate.map((d) => fmtDateTime(d));
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
			const newEvents = calendarData.events.map((ev) =>
				ev.uid === seriesId
					? {
							...ev,
							start: new Date(newStart),
							end: new Date(newEnd),
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

	const handleTimeSlotClick = useCallback(
		({ slotStart, slotEnd }: { slotStart: string; slotEnd: string }) =>
			openNewEvent({ start: new Date(slotStart), end: new Date(slotEnd) }),
		[openNewEvent],
	);
	const handleSlotDragEnd = useCallback(
		(rangeStart: string, rangeEnd: string) =>
			openNewEvent({ start: new Date(rangeStart), end: new Date(rangeEnd) }),
		[openNewEvent],
	);

	const handleDayOrAllDayClick = useCallback(
		(dateStr: string) => {
			const d = new Date(dateStr);
			const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
			const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
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

	return (
		<>
			<Schedule
				p="sm"
				events={scheduleEvents}
				defaultView="week"
				radius={0}
				layout="responsive"
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
						onSave={(ev) => {
							handleSaveEvent(ev);
							closeModal();
						}}
						onDelete={
							!isNewEvent && editingEvent?.uid
								? (uid) => {
										handleDeleteEvent(uid);
										closeModal();
									}
								: undefined
						}
					/>
				</React.Suspense>
			</Modal>
		</>
	);
}

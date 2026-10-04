import { type ChangeEvent, useCallback } from "react";

import type { CalendarEvent, RecurrenceRule } from "@/lib/utils/ics";

import { parseScheduleDate } from "../dates";
import type { WizardStepProps } from "./types";

export function useWizardInfoHandlers(
	setFormData: WizardStepProps["setFormData"],
) {
	const handleTypeChange = useCallback(
		(value: string | null) => {
			setFormData((prev) => ({
				...prev,
				type: value as CalendarEvent["type"],
				status: undefined,
			}));
		},
		[setFormData],
	);

	const handleSummaryChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			setFormData((prev) => ({
				...prev,
				summary: e.target.value,
			}));
		},
		[setFormData],
	);

	const handleAllDayChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const checked = e.currentTarget?.checked ?? false;
			setFormData((prev) => ({ ...prev, allDay: checked }));
		},
		[setFormData],
	);

	const handleStartChange = useCallback(
		(value: string | null) => {
			setFormData((prev) => ({
				...prev,
				start: parseScheduleDate(value),
			}));
		},
		[setFormData],
	);

	const handleRepeatChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			if (e.currentTarget.checked) {
				setFormData((prev) => ({
					...prev,
					rrule: { freq: "WEEKLY", interval: 1 },
				}));
				return;
			}
			setFormData((prev) => ({
				...prev,
				rrule: undefined,
				rruleString: undefined,
			}));
		},
		[setFormData],
	);

	const handleIntervalChange = useCallback(
		(value: string | number) => {
			setFormData((prev) => ({
				...prev,
				rrule: {
					...prev.rrule,
					interval: typeof value === "number" ? value : 1,
				} as RecurrenceRule,
			}));
		},
		[setFormData],
	);

	const handleFreqChange = useCallback(
		(value: string | null) => {
			setFormData((prev) => ({
				...prev,
				rrule: {
					...prev.rrule,
					freq: value as RecurrenceRule["freq"],
				} as RecurrenceRule,
			}));
		},
		[setFormData],
	);

	const handleByDayChange = useCallback(
		(value: string[]) => {
			setFormData((prev) => ({
				...prev,
				rrule: { ...prev.rrule, byDay: value } as RecurrenceRule,
			}));
		},
		[setFormData],
	);

	const handleCountChange = useCallback(
		(value: string | number) => {
			setFormData((prev) => ({
				...prev,
				rrule: {
					...prev.rrule,
					count: typeof value === "number" ? value : undefined,
				} as RecurrenceRule,
			}));
		},
		[setFormData],
	);

	const handleUntilChange = useCallback(
		(value: string | null) => {
			setFormData((prev) => ({
				...prev,
				rrule: {
					...prev.rrule,
					until: parseScheduleDate(value),
				} as RecurrenceRule,
			}));
		},
		[setFormData],
	);

	const handleStatusChange = useCallback(
		(value: string | null) => {
			setFormData((prev) => ({
				...prev,
				status: (value as CalendarEvent["status"]) || undefined,
			}));
		},
		[setFormData],
	);

	const handleTranspChange = useCallback(
		(value: string | null) => {
			setFormData((prev) => ({
				...prev,
				transp: value as "OPAQUE" | "TRANSPARENT",
			}));
		},
		[setFormData],
	);

	const handlePriorityChange = useCallback(
		(value: string | number) => {
			setFormData((prev) => ({
				...prev,
				priority: typeof value === "number" ? value : undefined,
			}));
		},
		[setFormData],
	);

	const handlePercentCompleteChange = useCallback(
		(value: string | number) => {
			setFormData((prev) => ({
				...prev,
				percentComplete: typeof value === "number" ? value : undefined,
			}));
		},
		[setFormData],
	);

	return {
		handleTypeChange,
		handleSummaryChange,
		handleAllDayChange,
		handleStartChange,
		handleRepeatChange,
		handleIntervalChange,
		handleFreqChange,
		handleByDayChange,
		handleCountChange,
		handleUntilChange,
		handleStatusChange,
		handleTranspChange,
		handlePriorityChange,
		handlePercentCompleteChange,
	};
}

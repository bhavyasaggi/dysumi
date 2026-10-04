import {
	Checkbox,
	Divider,
	Grid,
	Group,
	InputLabel,
	MultiSelect,
	NumberInput,
	Select,
	Space,
	Stack,
	Switch,
	TextInput,
} from "@mantine/core";
import { DateInput, DateTimePicker } from "@mantine/dates";
import { useCallback } from "react";

import type { RecurrenceRule } from "@/lib/utils/ics";
import { parseScheduleDate } from "../dates";

import type { WizardStepProps } from "./types";
import { useWizardInfoHandlers } from "./useWizardInfoHandlers";

const WEEKDAYS = [
	{ value: "MO", label: "Mon" },
	{ value: "TU", label: "Tue" },
	{ value: "WE", label: "Wed" },
	{ value: "TH", label: "Thu" },
	{ value: "FR", label: "Fri" },
	{ value: "SA", label: "Sat" },
	{ value: "SU", label: "Sun" },
];

function getStatusOptions(type?: string) {
	if (type === "VTODO") {
		return [
			{ value: "NEEDS-ACTION", label: "Needs Action" },
			{ value: "IN-PROCESS", label: "In Progress" },
			{ value: "COMPLETED", label: "Completed" },
			{ value: "CANCELLED", label: "Cancelled" },
		];
	}
	if (type === "VJOURNAL") {
		return [
			{ value: "DRAFT", label: "Draft" },
			{ value: "FINAL", label: "Final" },
			{ value: "CANCELLED", label: "Cancelled" },
		];
	}
	return [
		{ value: "TENTATIVE", label: "Tentative" },
		{ value: "CONFIRMED", label: "Confirmed" },
		{ value: "CANCELLED", label: "Cancelled" },
	];
}

function RecurrenceFields({
	rule,
	onInterval,
	onFreq,
	onByDay,
	onCount,
	onUntil,
}: {
	rule: RecurrenceRule;
	onInterval: (value: string | number) => void;
	onFreq: (value: string | null) => void;
	onByDay: (value: string[]) => void;
	onCount: (value: string | number) => void;
	onUntil: (value: string | null) => void;
}) {
	const interval = rule.interval ?? 1;
	const singular = interval === 1;
	return (
		<Grid>
			<Grid.Col span={{ base: 12, sm: 6 }}>
				<InputLabel component="div">Repeat every</InputLabel>
				<Group gap="sm" align="flex-end">
					<NumberInput
						aria-label="Repeat interval"
						min={1}
						max={99}
						w={70}
						value={interval}
						onChange={onInterval}
					/>
					<Select
						aria-label="Repeat unit"
						w={120}
						data={[
							{ value: "DAILY", label: singular ? "day" : "days" },
							{ value: "WEEKLY", label: singular ? "week" : "weeks" },
							{ value: "MONTHLY", label: singular ? "month" : "months" },
							{ value: "YEARLY", label: singular ? "year" : "years" },
						]}
						value={rule.freq}
						onChange={onFreq}
					/>
				</Group>
			</Grid.Col>
			{rule.freq === "WEEKLY" ? (
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<MultiSelect
						label="On days"
						data={WEEKDAYS}
						value={rule.byDay ?? []}
						onChange={onByDay}
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
					placeholder="Forever…"
					value={rule.count}
					onChange={onCount}
				/>
			</Grid.Col>
			<Grid.Col span={{ base: 12, sm: 6 }}>
				<DateInput
					label="End by date"
					placeholder="Forever…"
					value={rule.until ?? null}
					onChange={onUntil}
					clearable
				/>
			</Grid.Col>
		</Grid>
	);
}

function EndDateField({
	formData,
	setFormData,
}: Pick<WizardStepProps, "formData" | "setFormData">) {
	const handleDueChange = useCallback(
		(value: string | null) => {
			setFormData((prev) => ({ ...prev, due: parseScheduleDate(value) }));
		},
		[setFormData],
	);
	const handleEndChange = useCallback(
		(value: string | null) => {
			setFormData((prev) => ({ ...prev, end: parseScheduleDate(value) }));
		},
		[setFormData],
	);

	if (formData.type === "VTODO") {
		return formData.allDay ? (
			<DateInput
				label="Due Date"
				value={formData.due ?? null}
				onChange={handleDueChange}
			/>
		) : (
			<DateTimePicker
				label="Due"
				value={formData.due ?? null}
				onChange={handleDueChange}
			/>
		);
	}
	return formData.allDay ? (
		<DateInput
			label="End Date"
			value={formData.end ?? null}
			onChange={handleEndChange}
		/>
	) : (
		<DateTimePicker
			label="End"
			value={formData.end ?? null}
			onChange={handleEndChange}
		/>
	);
}

export default function WizardInfo({ formData, setFormData }: WizardStepProps) {
	const {
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
	} = useWizardInfoHandlers(setFormData);

	return (
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
						value={formData.type ?? "VEVENT"}
						onChange={handleTypeChange}
					/>
				</Grid.Col>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<TextInput
						label="Title"
						placeholder="Enter title…"
						required
						value={formData.summary ?? ""}
						onChange={handleSummaryChange}
						autoComplete="off"
						name="summary"
					/>
				</Grid.Col>
			</Grid>

			<Checkbox
				label="All day event"
				checked={formData.allDay}
				onChange={handleAllDayChange}
			/>

			<Grid>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					{formData.allDay ? (
						<DateInput
							label="Start Date"
							required
							value={formData.start ?? null}
							onChange={handleStartChange}
						/>
					) : (
						<DateTimePicker
							label="Start"
							required
							value={formData.start ?? null}
							onChange={handleStartChange}
						/>
					)}
				</Grid.Col>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<EndDateField formData={formData} setFormData={setFormData} />
				</Grid.Col>
			</Grid>

			<Divider label="Recurrence" labelPosition="left" />

			<Switch
				label="Repeat this event"
				checked={Boolean(formData.rrule)}
				onChange={handleRepeatChange}
			/>

			{formData.rrule ? (
				<RecurrenceFields
					rule={formData.rrule}
					onInterval={handleIntervalChange}
					onFreq={handleFreqChange}
					onByDay={handleByDayChange}
					onCount={handleCountChange}
					onUntil={handleUntilChange}
				/>
			) : null}

			<Divider label="Status" labelPosition="left" />

			<Grid>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<Select
						label="Status"
						data={getStatusOptions(formData.type)}
						value={formData.status ?? ""}
						onChange={handleStatusChange}
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
							value={formData.transp ?? "OPAQUE"}
							onChange={handleTranspChange}
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
							onChange={handlePriorityChange}
						/>
					</Grid.Col>
					<Grid.Col span={{ base: 12, sm: 6 }}>
						<NumberInput
							label="% Complete"
							min={0}
							max={100}
							suffix="%"
							value={formData.percentComplete}
							onChange={handlePercentCompleteChange}
						/>
					</Grid.Col>
				</Grid>
			)}
		</Stack>
	);
}

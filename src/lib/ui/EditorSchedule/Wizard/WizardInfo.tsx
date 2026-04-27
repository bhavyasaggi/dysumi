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

import type { CalendarEvent, RecurrenceRule } from "@/lib/utils/ics";

import type { WizardStepProps } from "./types";

function toDate(value: string | Date | null): Date | undefined {
	if (!value) return undefined;
	if (value instanceof Date) return value;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

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

function EndDateField({
	formData,
	setFormData,
}: Pick<WizardStepProps, "formData" | "setFormData">) {
	if (formData.type === "VTODO") {
		return formData.allDay ? (
			<DateInput
				label="Due Date"
				value={formData.due ?? null}
				onChange={(value) =>
					setFormData((prev) => ({ ...prev, due: toDate(value) }))
				}
			/>
		) : (
			<DateTimePicker
				label="Due"
				value={formData.due ?? null}
				onChange={(value) =>
					setFormData((prev) => ({ ...prev, due: toDate(value) }))
				}
			/>
		);
	}
	return formData.allDay ? (
		<DateInput
			label="End Date"
			value={formData.end ?? null}
			onChange={(value) =>
				setFormData((prev) => ({ ...prev, end: toDate(value) }))
			}
		/>
	) : (
		<DateTimePicker
			label="End"
			value={formData.end ?? null}
			onChange={(value) =>
				setFormData((prev) => ({ ...prev, end: toDate(value) }))
			}
		/>
	);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: form wizard with many conditional fields
export default function WizardInfo({ formData, setFormData }: WizardStepProps) {
	const toggleRecurrence = (enabled: boolean) => {
		if (enabled) {
			setFormData((prev) => ({
				...prev,
				rrule: { freq: "WEEKLY", interval: 1 },
			}));
		} else {
			setFormData((prev) => ({
				...prev,
				rrule: undefined,
				rruleString: undefined,
			}));
		}
	};

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
						onChange={(value) =>
							setFormData((prev) => ({
								...prev,
								type: value as CalendarEvent["type"],
								status: undefined,
							}))
						}
					/>
				</Grid.Col>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<TextInput
						label="Title"
						placeholder="Enter title"
						required
						value={formData.summary ?? ""}
						onChange={(e) =>
							setFormData((prev) => ({
								...prev,
								summary: e.target.value,
							}))
						}
						autoFocus
					/>
				</Grid.Col>
			</Grid>

			<Checkbox
				label="All day event"
				checked={formData.allDay}
				onChange={(e) => {
					const checked = e.currentTarget?.checked ?? false;
					setFormData((prev) => ({ ...prev, allDay: checked }));
				}}
			/>

			<Grid>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					{formData.allDay ? (
						<DateInput
							label="Start Date"
							required
							value={formData.start ?? null}
							onChange={(value) =>
								setFormData((prev) => ({
									...prev,
									start: toDate(value),
								}))
							}
						/>
					) : (
						<DateTimePicker
							label="Start"
							required
							value={formData.start ?? null}
							onChange={(value) =>
								setFormData((prev) => ({
									...prev,
									start: toDate(value),
								}))
							}
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
				onChange={(e) => toggleRecurrence(e.currentTarget.checked)}
			/>

			{formData.rrule ? (
				<Grid>
					<Grid.Col span={{ base: 12, sm: 6 }}>
						<InputLabel component="div">Repeat every</InputLabel>
						<Group gap="sm" align="flex-end">
							<NumberInput
								min={1}
								max={99}
								w={70}
								value={formData.rrule.interval ?? 1}
								onChange={(value) =>
									setFormData((prev) => ({
										...prev,
										rrule: {
											...prev.rrule,
											interval: typeof value === "number" ? value : 1,
										} as RecurrenceRule,
									}))
								}
							/>
							<Select
								w={120}
								data={[
									{
										value: "DAILY",
										label:
											(formData.rrule.interval ?? 1) === 1 ? "day" : "days",
									},
									{
										value: "WEEKLY",
										label:
											(formData.rrule.interval ?? 1) === 1 ? "week" : "weeks",
									},
									{
										value: "MONTHLY",
										label:
											(formData.rrule.interval ?? 1) === 1 ? "month" : "months",
									},
									{
										value: "YEARLY",
										label:
											(formData.rrule.interval ?? 1) === 1 ? "year" : "years",
									},
								]}
								value={formData.rrule.freq}
								onChange={(value) =>
									setFormData((prev) => ({
										...prev,
										rrule: {
											...prev.rrule,
											freq: value as RecurrenceRule["freq"],
										} as RecurrenceRule,
									}))
								}
							/>
						</Group>
					</Grid.Col>
					{formData.rrule.freq === "WEEKLY" ? (
						<Grid.Col span={{ base: 12, sm: 6 }}>
							<MultiSelect
								label="On days"
								data={WEEKDAYS}
								value={formData.rrule.byDay || []}
								onChange={(value) =>
									setFormData((prev) => ({
										...prev,
										rrule: { ...prev.rrule, byDay: value } as RecurrenceRule,
									}))
								}
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
							onChange={(value) =>
								setFormData((prev) => ({
									...prev,
									rrule: {
										...prev.rrule,
										count: typeof value === "number" ? value : undefined,
									} as RecurrenceRule,
								}))
							}
						/>
					</Grid.Col>
					<Grid.Col span={{ base: 12, sm: 6 }}>
						<DateInput
							label="End by date"
							placeholder="Forever"
							value={formData.rrule.until ?? null}
							onChange={(value) =>
								setFormData((prev) => ({
									...prev,
									rrule: {
										...prev.rrule,
										until: toDate(value),
									} as RecurrenceRule,
								}))
							}
							clearable
						/>
					</Grid.Col>
				</Grid>
			) : null}

			<Divider label="Status" labelPosition="left" />

			<Grid>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<Select
						label="Status"
						data={getStatusOptions(formData.type)}
						value={formData.status ?? ""}
						onChange={(value) =>
							setFormData((prev) => ({
								...prev,
								status: (value as CalendarEvent["status"]) || undefined,
							}))
						}
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
							onChange={(value) =>
								setFormData((prev) => ({
									...prev,
									transp: value as "OPAQUE" | "TRANSPARENT",
								}))
							}
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
							onChange={(value) =>
								setFormData((prev) => ({
									...prev,
									priority: typeof value === "number" ? value : undefined,
								}))
							}
						/>
					</Grid.Col>
					<Grid.Col span={{ base: 12, sm: 6 }}>
						<NumberInput
							label="% Complete"
							min={0}
							max={100}
							suffix="%"
							value={formData.percentComplete}
							onChange={(value) =>
								setFormData((prev) => ({
									...prev,
									percentComplete:
										typeof value === "number" ? value : undefined,
								}))
							}
						/>
					</Grid.Col>
				</Grid>
			)}
		</Stack>
	);
}

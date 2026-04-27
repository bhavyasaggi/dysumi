import {
	Box,
	Button,
	Divider,
	Group,
	Paper,
	Stack,
	Stepper,
	Text,
} from "@mantine/core";
import { useEffect, useState } from "react";

import Icon from "@/lib/ui/Icon";
import {
	buildRRuleString,
	type CalendarEvent,
	generateUid,
} from "@/lib/utils/ics";

import WizardDetails from "./WizardDetails";
import WizardInfo from "./WizardInfo";
import WizardParticipants from "./WizardParticipants";
import WizardReminders from "./WizardReminders";

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;
const LAST_STEP = TOTAL_STEPS - 1;

// ─── Component ───────────────────────────────────────────────────────────────

export interface EditorScheduleWizardProps {
	event: CalendarEvent | null;
	/** Whether this is a new event (not yet in the event list). */
	isNew: boolean;
	onSave: (event: CalendarEvent) => void;
	onDelete?: (uid: string) => void;
}

export default function EditorScheduleWizard({
	event,
	isNew,
	onSave,
	onDelete,
}: EditorScheduleWizardProps) {
	const [formData, setFormData] = useState<Partial<CalendarEvent>>({});
	const [activeStep, setActiveStep] = useState(0);

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

	const isEdit = !isNew;
	const isRecurringEvent = Boolean(formData.rrule);

	// ── Validation ──────────────────────────────────────────────────────────

	const getStepError = (step: number): string | null => {
		switch (step) {
			case 0:
				if (!formData.summary?.trim()) return "Title is required";
				if (!formData.start) return "Start date/time is required";
				return null;
			default:
				return null;
		}
	};

	const currentStepError = getStepError(activeStep);
	const canProceedFromCurrentStep = !currentStepError;
	const canSave = !getStepError(0);

	// ── Step navigation ─────────────────────────────────────────────────────

	const nextStep = () => {
		if (!canProceedFromCurrentStep) return;
		setActiveStep((s) => (s < LAST_STEP ? s + 1 : s));
	};

	const prevStep = () => {
		setActiveStep((s) => (s > 0 ? s - 1 : s));
	};

	const handleStepClick = (step: number) => {
		if (step < activeStep) {
			setActiveStep(step);
			return;
		}
		for (let i = activeStep; i < step; i++) {
			const error = getStepError(i);
			if (error) {
				setActiveStep(i);
				return;
			}
		}
		setActiveStep(step);
	};

	// ── Save / Delete ───────────────────────────────────────────────────────

	const handleSave = () => {
		if (!(formData.summary?.trim() && formData.start)) return;

		onSave({
			...formData,
			uid: formData.uid || generateUid(),
			type: formData.type || "VEVENT",
			summary: formData.summary,
			start: formData.start,
			rruleString: formData.rrule
				? buildRRuleString(formData.rrule)
				: undefined,
			sequence: (formData.sequence || 0) + 1,
			lastModified: new Date(),
		} as CalendarEvent);
	};

	const handleDelete = () => {
		if (formData.uid && onDelete) {
			onDelete(formData.uid);
		}
	};

	// ── Shared step props ───────────────────────────────────────────────────

	const stepProps = { formData, setFormData, event };

	// ── Render ──────────────────────────────────────────────────────────────

	return (
		<Stack gap="md">
			{isEdit && isRecurringEvent ? (
				<Paper
					p="xs"
					withBorder
					bg="blue.0"
					style={{ borderColor: "var(--mantine-color-blue-3)" }}
				>
					<Group gap="xs">
						<Icon
							icon="repeat"
							width={14}
							height={14}
							title="Recurring event"
							stroke="var(--mantine-color-blue-6)"
						/>
						<Text size="sm" c="blue.8">
							This is a recurring event. Changes will apply to all occurrences.
						</Text>
					</Group>
				</Paper>
			) : null}

			<Stepper
				active={activeStep}
				onStepClick={handleStepClick}
				size="sm"
				mb="lg"
			>
				<Stepper.Step label="Basic Info" description="Type, title, time">
					<WizardInfo {...stepProps} />
				</Stepper.Step>

				<Stepper.Step label="Details" description="Location, description">
					<WizardDetails {...stepProps} />
				</Stepper.Step>

				<Stepper.Step label="Participants" description="Organizer, attendees">
					<WizardParticipants {...stepProps} />
				</Stepper.Step>

				<Stepper.Step label="Reminders" description="Alarms, notifications">
					<WizardReminders {...stepProps} />
				</Stepper.Step>
			</Stepper>

			<Divider />

			{currentStepError && (
				<Group gap="xs">
					<Icon
						icon="alert-circle"
						width={16}
						height={16}
						title="Error"
						stroke="var(--mantine-color-red-6)"
					/>
					<Text size="sm" c="red">
						{currentStepError}
					</Text>
				</Group>
			)}

			<Group justify="space-between">
				{isEdit && onDelete ? (
					<Button color="red" variant="light" onClick={handleDelete}>
						Delete
					</Button>
				) : (
					<Box />
				)}

				<Group>
					{activeStep > 0 && (
						<Button variant="default" onClick={prevStep}>
							Back
						</Button>
					)}
					{activeStep < LAST_STEP && (
						<Button
							variant="light"
							onClick={nextStep}
							disabled={!canProceedFromCurrentStep}
						>
							Next
						</Button>
					)}
					<Button onClick={handleSave} disabled={!canSave}>
						{isEdit ? "Update" : "Create"}
					</Button>
				</Group>
			</Group>
		</Stack>
	);
}

import {
	Badge,
	CloseButton,
	Group,
	Paper,
	Select,
	Stack,
	Text,
} from "@mantine/core";

import type { WizardStepProps } from "./types";

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

function formatAlarmTrigger(trigger: string): string {
	const preset = ALARM_PRESETS.find((p) => p.value === trigger);
	if (preset) return preset.label;
	return trigger;
}

export default function WizardReminders({
	formData,
	setFormData,
}: WizardStepProps) {
	const addAlarm = (trigger: string) => {
		const alarms = formData.alarms || [];
		if (alarms.some((a) => a.trigger === trigger)) return;

		setFormData((prev) => ({
			...prev,
			alarms: [
				...(prev.alarms || []),
				{
					action: "DISPLAY" as const,
					trigger,
					description: prev.summary || "Reminder",
				},
			],
		}));
	};

	const removeAlarm = (trigger: string) => {
		setFormData((prev) => ({
			...prev,
			alarms: prev.alarms?.filter((a) => a.trigger !== trigger),
		}));
	};

	return (
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
					{formData.alarms.map((alarm) => (
						<Paper key={alarm.trigger} p="xs" withBorder>
							<Group justify="space-between" wrap="nowrap">
								<Group gap="xs">
									<Badge variant="light" size="sm">
										{alarm.action}
									</Badge>
									<Text size="sm">{formatAlarmTrigger(alarm.trigger)}</Text>
								</Group>
								<CloseButton
									size="sm"
									onClick={() => removeAlarm(alarm.trigger)}
								/>
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
	);
}

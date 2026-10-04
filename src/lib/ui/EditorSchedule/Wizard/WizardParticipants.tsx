import {
	Box,
	Button,
	CloseButton,
	Divider,
	Grid,
	Group,
	Paper,
	Select,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import {
	type ChangeEvent,
	type KeyboardEvent,
	useCallback,
	useState,
} from "react";

import type { CalendarAttendee, CalendarEvent } from "@/lib/utils/ics";

import type { WizardStepProps } from "./types";

function AttendeeRow({
	att,
	setFormData,
}: {
	att: CalendarAttendee;
	setFormData: WizardStepProps["setFormData"];
}) {
	const handleRoleChange = useCallback(
		(value: string | null) => {
			setFormData((prev) => ({
				...prev,
				attendees: prev.attendees?.map((a) =>
					a.email === att.email
						? {
								...a,
								role: value as CalendarAttendee["role"],
							}
						: a,
				),
			}));
		},
		[att.email, setFormData],
	);

	const handlePartstatChange = useCallback(
		(value: string | null) => {
			setFormData((prev) => ({
				...prev,
				attendees: prev.attendees?.map((a) =>
					a.email === att.email
						? {
								...a,
								partstat: value as CalendarAttendee["partstat"],
							}
						: a,
				),
			}));
		},
		[att.email, setFormData],
	);

	const handleRemove = useCallback(() => {
		setFormData((prev) => ({
			...prev,
			attendees: prev.attendees?.filter((a) => a.email !== att.email),
		}));
	}, [att.email, setFormData]);

	return (
		<Paper p="xs" withBorder>
			<Group justify="space-between" wrap="nowrap">
				<Box style={{ flex: 1 }}>
					<Text size="sm" fw={500}>
						{att.name ? att.name : att.email}
					</Text>
					{att.name ? (
						<Text size="xs" c="dimmed">
							{att.email}
						</Text>
					) : null}
				</Box>
				<Group gap="xs">
					<Select
						size="xs"
						aria-label={`Role for ${att.email}`}
						value={att.role ?? "REQ-PARTICIPANT"}
						data={[
							{ value: "CHAIR", label: "Chair" },
							{
								value: "REQ-PARTICIPANT",
								label: "Required",
							},
							{
								value: "OPT-PARTICIPANT",
								label: "Optional",
							},
							{
								value: "NON-PARTICIPANT",
								label: "FYI",
							},
						]}
						onChange={handleRoleChange}
						style={{ width: 110 }}
					/>
					<Select
						size="xs"
						aria-label={`Response for ${att.email}`}
						value={att.partstat ?? "NEEDS-ACTION"}
						data={[
							{
								value: "NEEDS-ACTION",
								label: "Pending",
							},
							{ value: "ACCEPTED", label: "Accepted" },
							{ value: "DECLINED", label: "Declined" },
							{
								value: "TENTATIVE",
								label: "Tentative",
							},
						]}
						onChange={handlePartstatChange}
						style={{ width: 100 }}
					/>
					<CloseButton
						size="sm"
						onClick={handleRemove}
						aria-label={`Remove ${att.email}`}
					/>
				</Group>
			</Group>
		</Paper>
	);
}

export default function WizardParticipants({
	formData,
	setFormData,
}: WizardStepProps) {
	const [newAttendeeEmail, setNewAttendeeEmail] = useState("");

	const addAttendee = useCallback(() => {
		if (!newAttendeeEmail.trim()) return;
		const attendees = formData.attendees || [];
		if (attendees.some((a) => a.email === newAttendeeEmail.trim())) return;

		setFormData((prev) => ({
			...prev,
			attendees: [
				...attendees,
				{
					email: newAttendeeEmail.trim(),
					partstat: "NEEDS-ACTION",
					role: "REQ-PARTICIPANT",
				},
			],
		}));
		setNewAttendeeEmail("");
	}, [formData.attendees, newAttendeeEmail, setFormData]);

	const handleContactChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			setFormData((prev) => ({
				...prev,
				contact: e.target.value,
			}));
		},
		[setFormData],
	);

	const handleClassificationChange = useCallback(
		(value: string | null) => {
			setFormData((prev) => ({
				...prev,
				classification: value as CalendarEvent["classification"],
			}));
		},
		[setFormData],
	);

	const handleOrganizerNameChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			setFormData((prev) => ({
				...prev,
				organizer: {
					...prev.organizer,
					email: prev.organizer?.email || "",
					name: e.target.value,
				},
			}));
		},
		[setFormData],
	);

	const handleOrganizerEmailChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			setFormData((prev) => ({
				...prev,
				organizer: {
					...prev.organizer,
					email: e.target.value,
					name: prev.organizer?.name,
				},
			}));
		},
		[setFormData],
	);

	const handleNewAttendeeEmailChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			setNewAttendeeEmail(e.target.value);
		},
		[],
	);

	const handleNewAttendeeKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				e.preventDefault();
				addAttendee();
			}
		},
		[addAttendee],
	);

	return (
		<Stack gap="md" mt="md">
			<Grid>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<TextInput
						label="Contact"
						placeholder="Contact person or info…"
						value={formData.contact || ""}
						onChange={handleContactChange}
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
						onChange={handleClassificationChange}
					/>
				</Grid.Col>
			</Grid>

			<Divider label="Organizer" labelPosition="left" />

			<Grid>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<TextInput
						label="Organizer Name"
						placeholder="Your name…"
						value={formData.organizer?.name || ""}
						onChange={handleOrganizerNameChange}
					/>
				</Grid.Col>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<TextInput
						label="Organizer Email"
						placeholder="name@example.com"
						type="email"
						name="organizer-email"
						autoComplete="email"
						spellCheck={false}
						value={formData.organizer?.email || ""}
						onChange={handleOrganizerEmailChange}
					/>
				</Grid.Col>
			</Grid>

			<Divider label="Attendees" labelPosition="left" />

			<Group>
				<TextInput
					aria-label="Attendee email"
					placeholder="attendee@example.com"
					type="email"
					name="attendee-email"
					autoComplete="off"
					spellCheck={false}
					value={newAttendeeEmail}
					onChange={handleNewAttendeeEmailChange}
					onKeyDown={handleNewAttendeeKeyDown}
					style={{ flex: 1 }}
				/>
				<Button onClick={addAttendee} variant="light">
					Add
				</Button>
			</Group>

			{formData.attendees && formData.attendees.length > 0 && (
				<Stack gap="xs">
					{formData.attendees.map((att) => (
						<AttendeeRow key={att.email} att={att} setFormData={setFormData} />
					))}
				</Stack>
			)}

			{(!formData.attendees || formData.attendees.length === 0) && (
				<Text size="sm" c="dimmed" ta="center" py="md">
					No attendees added yet
				</Text>
			)}
		</Stack>
	);
}

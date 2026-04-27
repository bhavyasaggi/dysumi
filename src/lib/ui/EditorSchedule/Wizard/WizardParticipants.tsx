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
import { useState } from "react";

import type { CalendarAttendee, CalendarEvent } from "@/lib/utils/ics";

import type { WizardStepProps } from "./types";

export default function WizardParticipants({
	formData,
	setFormData,
}: WizardStepProps) {
	const [newAttendeeEmail, setNewAttendeeEmail] = useState("");

	const addAttendee = () => {
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
	};

	const removeAttendee = (email: string) => {
		setFormData((prev) => ({
			...prev,
			attendees: prev.attendees?.filter((a) => a.email !== email),
		}));
	};

	return (
		<Stack gap="md" mt="md">
			<Grid>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<TextInput
						label="Contact"
						placeholder="Contact person or info"
						value={formData.contact || ""}
						onChange={(e) =>
							setFormData((prev) => ({
								...prev,
								contact: e.target.value,
							}))
						}
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
						onChange={(value) =>
							setFormData((prev) => ({
								...prev,
								classification: value as CalendarEvent["classification"],
							}))
						}
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
						onChange={(e) =>
							setFormData((prev) => ({
								...prev,
								organizer: {
									...prev.organizer,
									email: prev.organizer?.email || "",
									name: e.target.value,
								},
							}))
						}
					/>
				</Grid.Col>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<TextInput
						label="Organizer Email"
						placeholder="your@email.com"
						type="email"
						value={formData.organizer?.email || ""}
						onChange={(e) =>
							setFormData((prev) => ({
								...prev,
								organizer: {
									...prev.organizer,
									email: e.target.value,
									name: prev.organizer?.name,
								},
							}))
						}
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
				<Button onClick={addAttendee} variant="light">
					Add
				</Button>
			</Group>

			{formData.attendees && formData.attendees.length > 0 && (
				<Stack gap="xs">
					{formData.attendees.map((att) => (
						<Paper key={att.email} p="xs" withBorder>
							<Group justify="space-between" wrap="nowrap">
								<Box style={{ flex: 1 }}>
									<Text size="sm" fw={500}>
										{att.name || att.email}
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
										value={att.role || "REQ-PARTICIPANT"}
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
										onChange={(value) =>
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
											}))
										}
										style={{ width: 110 }}
									/>
									<Select
										size="xs"
										value={att.partstat || "NEEDS-ACTION"}
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
										onChange={(value) =>
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
											}))
										}
										style={{ width: 100 }}
									/>
									<CloseButton
										size="sm"
										onClick={() => removeAttendee(att.email)}
									/>
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
	);
}

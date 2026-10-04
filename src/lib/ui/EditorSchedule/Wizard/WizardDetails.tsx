import {
	Divider,
	Grid,
	NumberInput,
	Stack,
	Textarea,
	TextInput,
} from "@mantine/core";
import { type ChangeEvent, type FocusEvent, useCallback } from "react";

import type { WizardStepProps } from "./types";

export default function WizardDetails({
	formData,
	setFormData,
	event,
}: WizardStepProps) {
	const onDescription = useCallback(
		(input: ChangeEvent<HTMLTextAreaElement>) => {
			setFormData((prev) => ({
				...prev,
				description: input.target.value,
			}));
		},
		[setFormData],
	);
	const onUrl = useCallback(
		(input: ChangeEvent<HTMLInputElement>) => {
			setFormData((prev) => ({ ...prev, url: input.target.value }));
		},
		[setFormData],
	);
	const onCategories = useCallback(
		(input: FocusEvent<HTMLInputElement>) => {
			setFormData((prev) => ({
				...prev,
				categories: input.target.value
					.split(",")
					.map((item) => item.trim())
					.filter(Boolean),
			}));
		},
		[setFormData],
	);
	const onResources = useCallback(
		(input: FocusEvent<HTMLInputElement>) => {
			setFormData((prev) => ({
				...prev,
				resources: input.target.value
					.split(",")
					.map((item) => item.trim())
					.filter(Boolean),
			}));
		},
		[setFormData],
	);
	const onLocation = useCallback(
		(input: ChangeEvent<HTMLInputElement>) => {
			setFormData((prev) => ({
				...prev,
				location: input.target.value,
			}));
		},
		[setFormData],
	);
	const onLatitude = useCallback(
		(value: string | number) => {
			setFormData((prev) => ({
				...prev,
				geo:
					typeof value === "number"
						? { lat: value, lon: prev.geo?.lon || 0 }
						: prev.geo,
			}));
		},
		[setFormData],
	);
	const onLongitude = useCallback(
		(value: string | number) => {
			setFormData((prev) => ({
				...prev,
				geo:
					typeof value === "number"
						? { lat: prev.geo?.lat || 0, lon: value }
						: prev.geo,
			}));
		},
		[setFormData],
	);
	const eventKey = event?.uid ? event.uid : "new";

	return (
		<Stack gap="md" mt="md">
			<Textarea
				label="Description"
				placeholder="Enter description (optional)…"
				rows={4}
				value={formData.description || ""}
				onChange={onDescription}
			/>

			<TextInput
				label="URL"
				placeholder="https://…"
				type="url"
				name="event-url"
				autoComplete="url"
				spellCheck={false}
				value={formData.url || ""}
				onChange={onUrl}
			/>

			<Grid>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<TextInput
						label="Categories"
						placeholder="work, meeting, important"
						description="Comma-separated (press Tab or click away to apply)"
						defaultValue={formData.categories?.join(", ") || ""}
						key={`categories-${eventKey}`}
						onBlur={onCategories}
					/>
				</Grid.Col>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<TextInput
						label="Resources"
						placeholder="projector, whiteboard"
						description="Comma-separated (press Tab or click away to apply)"
						defaultValue={formData.resources?.join(", ") || ""}
						key={`resources-${eventKey}`}
						onBlur={onResources}
					/>
				</Grid.Col>
			</Grid>

			<Divider label="Geographic Location" labelPosition="left" />

			<TextInput
				label="Location"
				placeholder="Enter location (optional)…"
				value={formData.location || ""}
				onChange={onLocation}
			/>

			<Grid>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<NumberInput
						label="Latitude"
						decimalScale={6}
						min={-90}
						max={90}
						placeholder="-90 to 90"
						value={formData.geo?.lat}
						onChange={onLatitude}
					/>
				</Grid.Col>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<NumberInput
						label="Longitude"
						decimalScale={6}
						min={-180}
						max={180}
						placeholder="-180 to 180"
						value={formData.geo?.lon}
						onChange={onLongitude}
					/>
				</Grid.Col>
			</Grid>
		</Stack>
	);
}

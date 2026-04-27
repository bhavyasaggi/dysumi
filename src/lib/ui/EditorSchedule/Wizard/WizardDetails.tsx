import {
	Divider,
	Grid,
	NumberInput,
	Stack,
	Textarea,
	TextInput,
} from "@mantine/core";

import type { WizardStepProps } from "./types";

export default function WizardDetails({
	formData,
	setFormData,
	event,
}: WizardStepProps) {
	return (
		<Stack gap="md" mt="md">
			<Textarea
				label="Description"
				placeholder="Enter description (optional)"
				rows={4}
				value={formData.description || ""}
				onChange={(e) =>
					setFormData((prev) => ({
						...prev,
						description: e.target.value,
					}))
				}
			/>

			<TextInput
				label="URL"
				placeholder="https://..."
				type="url"
				value={formData.url || ""}
				onChange={(e) =>
					setFormData((prev) => ({
						...prev,
						url: e.target.value,
					}))
				}
			/>

			<Grid>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<TextInput
						label="Categories"
						placeholder="work, meeting, important"
						description="Comma-separated (press Tab or click away to apply)"
						defaultValue={formData.categories?.join(", ") || ""}
						key={`categories-${event?.uid || "new"}`}
						onBlur={(e) =>
							setFormData((prev) => ({
								...prev,
								categories: e.target.value
									.split(",")
									.map((c) => c.trim())
									.filter(Boolean),
							}))
						}
					/>
				</Grid.Col>
				<Grid.Col span={{ base: 12, sm: 6 }}>
					<TextInput
						label="Resources"
						placeholder="projector, whiteboard"
						description="Comma-separated (press Tab or click away to apply)"
						defaultValue={formData.resources?.join(", ") || ""}
						key={`resources-${event?.uid || "new"}`}
						onBlur={(e) =>
							setFormData((prev) => ({
								...prev,
								resources: e.target.value
									.split(",")
									.map((c) => c.trim())
									.filter(Boolean),
							}))
						}
					/>
				</Grid.Col>
			</Grid>

			<Divider label="Geographic Location" labelPosition="left" />

			<TextInput
				label="Location"
				placeholder="Enter location (optional)"
				value={formData.location || ""}
				onChange={(e) =>
					setFormData((prev) => ({
						...prev,
						location: e.target.value,
					}))
				}
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
						onChange={(value) =>
							setFormData((prev) => ({
								...prev,
								geo:
									typeof value === "number"
										? { lat: value, lon: prev.geo?.lon || 0 }
										: prev.geo,
							}))
						}
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
						onChange={(value) =>
							setFormData((prev) => ({
								...prev,
								geo:
									typeof value === "number"
										? { lat: prev.geo?.lat || 0, lon: value }
										: prev.geo,
							}))
						}
					/>
				</Grid.Col>
			</Grid>
		</Stack>
	);
}

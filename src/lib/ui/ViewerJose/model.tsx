import {
	Badge,
	SegmentedControl,
	Select,
	Stack,
	Table,
	Text,
	Textarea,
} from "@mantine/core";
import { type ChangeEvent, useCallback } from "react";
import type {
	KeyFormat,
	SecretEncoding,
	VerifyResult,
} from "@/lib/utils/jose/verify";
import {
	keyMaterialLabel,
	keyMaterialPlaceholder,
	shortPart,
	verifyDetail,
} from "./format";
import styles from "./styles.module.scss";

export function TokenParts({ compact }: { compact: string }) {
	const [header, payload, signature] = compact.split(".");
	return (
		<Text className={styles.token} title={compact}>
			<Text span c="red">
				{shortPart(header ?? "")}
			</Text>
			.
			<Text span c="grape">
				{shortPart(payload ?? "")}
			</Text>
			.
			<Text span c="blue">
				{shortPart(signature ?? "")}
			</Text>
		</Text>
	);
}

export function FieldTable({
	rows,
}: {
	rows: {
		name: string;
		value: string;
		hint: string;
		tone: "expired" | "pending" | null;
	}[];
}) {
	return (
		<Table horizontalSpacing="sm" verticalSpacing={6} withRowBorders>
			<Table.Thead>
				<Table.Tr>
					<Table.Th w={140}>Claim</Table.Th>
					<Table.Th>Value</Table.Th>
				</Table.Tr>
			</Table.Thead>
			<Table.Tbody>
				{rows.map((row) => (
					<Table.Tr key={row.name}>
						<Table.Td>
							<Text size="xs" fw={600} ff="monospace">
								{row.name}
							</Text>
							{row.hint ? (
								<Text size="xs" c="dimmed">
									{row.hint}
								</Text>
							) : null}
						</Table.Td>
						<Table.Td>
							<Text
								size="xs"
								ff="monospace"
								c={row.tone === "expired" ? "red" : undefined}
								style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
							>
								{row.value}
								{row.tone === "expired" ? " · expired" : ""}
								{row.tone === "pending" ? " · not yet valid" : ""}
							</Text>
						</Table.Td>
					</Table.Tr>
				))}
			</Table.Tbody>
		</Table>
	);
}

export function SignatureBadge({ result }: { result: VerifyResult }) {
	if (result.state === "valid")
		return <Badge color="teal">Signature valid</Badge>;
	if (result.state === "invalid")
		return <Badge color="red">Signature invalid</Badge>;
	if (result.state === "unsecured")
		return <Badge color="yellow">Unsecured</Badge>;
	if (result.state === "error") return <Badge color="red">Key error</Badge>;
	return <Badge color="gray">Unverified</Badge>;
}

export function VerifyForm({
	format,
	encoding,
	material,
	onFormat,
	onEncoding,
	onMaterial,
	result,
}: {
	format: KeyFormat;
	encoding: SecretEncoding;
	material: string;
	onFormat: (value: KeyFormat) => void;
	onEncoding: (value: SecretEncoding) => void;
	onMaterial: (value: string) => void;
	result: VerifyResult;
}) {
	const detail = verifyDetail(result);
	const handleFormat = useCallback(
		(value: string) => {
			onFormat(value as KeyFormat);
		},
		[onFormat],
	);
	const handleEncoding = useCallback(
		(value: string | null) => {
			onEncoding(value === "base64url" ? "base64url" : "utf8");
		},
		[onEncoding],
	);
	const handleMaterial = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			onMaterial(event.currentTarget.value);
		},
		[onMaterial],
	);
	return (
		<Stack gap="sm" p="sm">
			<SegmentedControl
				size="xs"
				fullWidth
				aria-label="Key format"
				value={format}
				onChange={handleFormat}
				data={[
					{ label: "Secret", value: "secret" },
					{ label: "PEM", value: "pem" },
					{ label: "JWK", value: "jwk" },
				]}
			/>
			{format === "secret" ? (
				<Select
					size="xs"
					label="Secret encoding"
					value={encoding}
					onChange={handleEncoding}
					data={[
						{ value: "utf8", label: "UTF-8" },
						{ value: "base64url", label: "Base64url" },
					]}
					allowDeselect={false}
				/>
			) : null}
			<Textarea
				size="xs"
				label={keyMaterialLabel(format)}
				placeholder={keyMaterialPlaceholder(format)}
				name="key-material"
				autoComplete="off"
				spellCheck={false}
				autosize
				minRows={4}
				maxRows={10}
				value={material}
				onChange={handleMaterial}
			/>
			<Text size="xs" c={detail.color}>
				{detail.text}
			</Text>
		</Stack>
	);
}

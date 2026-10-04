import {
	Badge,
	Button,
	Code,
	CopyButton,
	Divider,
	Group,
	ScrollArea,
	Stack,
	Tabs,
	Text,
	Textarea,
} from "@mantine/core";
import { calculateJwkThumbprint, type JWK } from "jose";
import {
	type ChangeEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { ALG_INFO } from "@/lib/utils/jose/claims";
import {
	isPrivateKey,
	type JsonObject,
	type ParsedJwe,
	type ParsedJws,
	parseJose,
} from "@/lib/utils/jose/parse";
import type { KeyFormat, SecretEncoding } from "@/lib/utils/jose/verify";
import {
	objectRows,
	pretty,
	showValue,
	tokenNote,
	tokenTone,
	useSignature,
} from "./format";
import { FieldTable, SignatureBadge, TokenParts, VerifyForm } from "./model";
import styles from "./styles.module.scss";

export function TokenView({
	token,
	source,
}: {
	token: ParsedJws;
	source: string | null;
}) {
	const [format, setFormat] = useState<KeyFormat>("secret");
	const [encoding, setEncoding] = useState<SecretEncoding>("utf8");
	const [material, setMaterial] = useState("");
	const result = useSignature(token, material, { format, encoding });
	const alg =
		typeof token.header.alg === "string" ? token.header.alg : "unknown";
	const life = tokenTone(token.payload);
	const headerRows = objectRows(token.header);
	const payloadRows = token.payload
		? objectRows(token.payload)
		: [
				{
					name: "payload",
					value: token.payloadText,
					hint: "Payload is not a JSON object",
					tone: null,
				},
			];
	const json = pretty({
		header: token.header,
		payload: token.payload ?? token.payloadText,
	});

	return (
		<div className={styles.layout}>
			<div className={styles.main}>
				<Group
					className={styles.bar}
					justify="space-between"
					wrap="nowrap"
					gap="xs"
					px="sm"
				>
					<Group gap={6} wrap="nowrap" miw={0}>
						<Badge variant="light">{alg}</Badge>
						{life === "expired" ? <Badge color="red">Expired</Badge> : null}
						{life === "pending" ? (
							<Badge color="yellow">Not yet valid</Badge>
						) : null}
						<SignatureBadge result={result} />
					</Group>
					<CopyButton value={json}>
						{({ copied, copy }) => (
							<Button size="compact-xs" variant="default" onClick={copy}>
								{copied ? "Copied" : "Copy JSON"}
							</Button>
						)}
					</CopyButton>
				</Group>
				<Divider />
				<TokenParts compact={token.compact} />
				<Divider />
				{source ? (
					<Text size="xs" c="dimmed" px="sm" py={4}>
						Read from the {source} field
					</Text>
				) : null}
				<Text size="xs" c="dimmed" px="sm" py={4}>
					{ALG_INFO[alg] ?? "JSON Web Signature"}
					{Array.isArray(token.header.crit)
						? " · critical header parameters are present"
						: ""}
				</Text>
				<Tabs defaultValue="claims" className={styles.body} keepMounted={false}>
					<Tabs.List>
						<Tabs.Tab value="claims">Claims</Tabs.Tab>
						<Tabs.Tab value="json">JSON</Tabs.Tab>
					</Tabs.List>
					<Tabs.Panel value="claims" className={styles.body}>
						<ScrollArea scrollbars="y">
							<Text size="xs" fw={600} c="dimmed" px="sm" pt="sm">
								Header
							</Text>
							<FieldTable rows={headerRows} />
							<Text size="xs" fw={600} c="dimmed" px="sm" pt="sm">
								Payload
							</Text>
							<FieldTable rows={payloadRows} />
						</ScrollArea>
					</Tabs.Panel>
					<Tabs.Panel value="json">
						<ScrollArea scrollbars="y">
							<Code block className={styles.json}>
								{json}
							</Code>
						</ScrollArea>
					</Tabs.Panel>
				</Tabs>
			</div>
			<aside className={styles.side}>
				<Group className={styles.bar}>
					<Text size="sm" px="sm">
						Verify
					</Text>
				</Group>
				<Divider />
				<ScrollArea className={styles.scroll} scrollbars="y">
					<VerifyForm
						format={format}
						encoding={encoding}
						material={material}
						onFormat={setFormat}
						onEncoding={setEncoding}
						onMaterial={setMaterial}
						result={result}
					/>
				</ScrollArea>
			</aside>
		</div>
	);
}

export function JweView({ token }: { token: ParsedJwe }) {
	const rows = [
		{
			name: "encrypted_key",
			value: `${token.encryptedKey.length} chars`,
			hint: "Wrapped content key",
			tone: null,
		},
		{
			name: "iv",
			value: `${token.iv.length} chars`,
			hint: "Initialization vector",
			tone: null,
		},
		{
			name: "ciphertext",
			value: `${token.ciphertext.length} chars`,
			hint: "Encrypted payload",
			tone: null,
		},
		{
			name: "tag",
			value: `${token.tag.length} chars`,
			hint: "Authentication tag",
			tone: null,
		},
	];
	return (
		<div className={styles.layout}>
			<div className={styles.main}>
				<Group className={styles.bar} px="sm">
					<Badge variant="light">{showValue(token.header.alg) || "JWE"}</Badge>
					<Badge color="gray">Encrypted</Badge>
				</Group>
				<Divider />
				<ScrollArea className={styles.scroll} scrollbars="y">
					<Text size="xs" c="dimmed" px="sm" py={6}>
						Protected header only. The ciphertext is left encrypted.
					</Text>
					<FieldTable rows={objectRows(token.header)} />
					<FieldTable rows={rows} />
				</ScrollArea>
			</div>
		</div>
	);
}

export function KeySummary({ jwk }: { jwk: JsonObject }) {
	const [thumb, setThumb] = useState<string>("");
	useEffect(() => {
		let cancel = false;
		calculateJwkThumbprint(jwk as JWK)
			.then((value) => {
				if (!cancel) setThumb(value);
			})
			.catch(() => {
				if (!cancel) setThumb("");
			});
		return () => {
			cancel = true;
		};
	}, [jwk]);
	const rows = objectRows(jwk).map((row) =>
		row.value.length > 80
			? { ...row, value: `${row.value.slice(0, 72)}…` }
			: row,
	);
	if (thumb) {
		rows.unshift({
			name: "thumbprint",
			value: thumb,
			hint: "RFC 7638 SHA-256 thumbprint",
			tone: null,
		});
	}
	return <FieldTable rows={rows} />;
}

function KeySelectButton({
	item,
	itemIndex,
	active,
	onSelect,
}: {
	item: JsonObject;
	itemIndex: number;
	active: boolean;
	onSelect: (index: number) => void;
}) {
	const selectKey = useCallback(() => {
		onSelect(itemIndex);
	}, [itemIndex, onSelect]);
	return (
		<Button
			size="compact-xs"
			variant={active ? "light" : "default"}
			onClick={selectKey}
		>
			{showValue(item.kid) || `Key ${itemIndex + 1}`}
		</Button>
	);
}

export function KeyView({ keys }: { keys: JsonObject[] }) {
	const [index, setIndex] = useState(0);
	const [tokenText, setTokenText] = useState("");
	const key = keys[Math.min(index, keys.length - 1)] ?? {};
	const parsedToken = useMemo(() => {
		const trimmed = tokenText.trim();
		if (trimmed.split(".").length < 3) return null;
		try {
			return parseJose(trimmed, "jwt");
		} catch {
			return null;
		}
	}, [tokenText]);
	const jws = parsedToken?.kind === "jws" ? parsedToken.token : null;
	const material = useMemo(() => JSON.stringify(key), [key]);
	const result = useSignature(jws, jws ? material : "", {
		format: "jwk",
		encoding: "utf8",
	});
	const privateKey = isPrivateKey(key);
	const handleTokenChange = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			setTokenText(event.currentTarget.value);
		},
		[],
	);

	return (
		<div className={styles.layout}>
			<div className={styles.main}>
				<Group
					className={styles.bar}
					justify="space-between"
					wrap="nowrap"
					px="sm"
				>
					<Group gap={6} wrap="nowrap">
						<Badge variant="light">{showValue(key.kty) || "JWK"}</Badge>
						<Badge color={privateKey ? "yellow" : "teal"}>
							{privateKey ? "Private" : "Public"}
						</Badge>
						{typeof key.alg === "string" ? (
							<Badge color="gray">{key.alg}</Badge>
						) : null}
					</Group>
					<CopyButton value={pretty(keys.length === 1 ? key : { keys })}>
						{({ copied, copy }) => (
							<Button size="compact-xs" variant="default" onClick={copy}>
								{copied ? "Copied" : "Copy JSON"}
							</Button>
						)}
					</CopyButton>
				</Group>
				<Divider />
				{keys.length > 1 ? (
					<ScrollArea scrollbars="x">
						<Group gap={4} wrap="nowrap" p="xs">
							{keys.map((item, itemIndex) => (
								<KeySelectButton
									key={JSON.stringify([
										item.kty,
										item.kid,
										item.n,
										item.e,
										item.crv,
										item.x,
										item.y,
										item.k,
									])}
									item={item}
									itemIndex={itemIndex}
									active={itemIndex === index}
									onSelect={setIndex}
								/>
							))}
						</Group>
					</ScrollArea>
				) : null}
				<ScrollArea className={styles.scroll} scrollbars="y">
					<KeySummary jwk={key} />
					<Code block className={styles.json}>
						{pretty(key)}
					</Code>
				</ScrollArea>
			</div>
			<aside className={styles.side}>
				<Group className={styles.bar}>
					<Text size="sm" px="sm">
						Check a token
					</Text>
				</Group>
				<Divider />
				<Stack gap="sm" p="sm">
					<Textarea
						size="xs"
						label="JWT"
						placeholder="eyJhbGciOi…"
						name="jwt"
						autoComplete="off"
						spellCheck={false}
						autosize
						minRows={4}
						maxRows={8}
						value={tokenText}
						onChange={handleTokenChange}
					/>
					<Text size="xs" c={tokenNote(tokenText, jws, result).color}>
						{tokenNote(tokenText, jws, result).text}
					</Text>
				</Stack>
			</aside>
		</div>
	);
}

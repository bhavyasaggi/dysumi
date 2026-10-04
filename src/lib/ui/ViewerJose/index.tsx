import {
	Badge,
	Button,
	CopyButton,
	Divider,
	Group,
	ScrollArea,
	Stack,
	Text,
} from "@mantine/core";
import { useMemo } from "react";
import {
	type JoseDocument,
	type JsonObject,
	parseJose,
} from "@/lib/utils/jose/parse";
import { objectRows, pretty, showValue } from "./format";
import { FieldTable } from "./model";
import styles from "./styles.module.scss";
import { JweView, KeyView, TokenView } from "./views";

const DISCOVERY_FIELDS = [
	"issuer",
	"authorization_endpoint",
	"token_endpoint",
	"userinfo_endpoint",
	"jwks_uri",
	"registration_endpoint",
	"scopes_supported",
	"response_types_supported",
	"id_token_signing_alg_values_supported",
	"subject_types_supported",
];

function DiscoveryView({ document }: { document: JsonObject }) {
	const known = DISCOVERY_FIELDS.filter((name) => name in document);
	const rows = known.map((name) => ({
		name,
		value: showValue(document[name]),
		hint: "",
		tone: null,
	}));
	return (
		<div className={styles.layout}>
			<div className={styles.main}>
				<Group className={styles.bar} justify="space-between" px="sm">
					<Badge variant="light">Discovery</Badge>
					<CopyButton value={pretty(document)}>
						{({ copied, copy }) => (
							<Button size="compact-xs" variant="default" onClick={copy}>
								{copied ? "Copied" : "Copy JSON"}
							</Button>
						)}
					</CopyButton>
				</Group>
				<Divider />
				<ScrollArea className={styles.scroll} scrollbars="y">
					<Text size="xs" c="dimmed" px="sm" py={6}>
						OpenID provider metadata stored in this file. Remote addresses are
						not requested.
					</Text>
					<FieldTable rows={rows.length > 0 ? rows : objectRows(document)} />
				</ScrollArea>
			</div>
		</div>
	);
}

function documentView(document: JoseDocument) {
	if (document.kind === "jws") {
		return <TokenView token={document.token} source={document.source} />;
	}
	if (document.kind === "jwe") return <JweView token={document.token} />;
	if (document.kind === "jwk") return <KeyView keys={[document.key]} />;
	if (document.kind === "jwks") return <KeyView keys={document.keys} />;
	return <DiscoveryView document={document.document} />;
}

export default function ViewerJose({
	source,
	extension,
}: {
	source: string;
	extension: string;
}) {
	const parsed = useMemo(() => {
		try {
			return { document: parseJose(source, extension), error: null };
		} catch (error) {
			return {
				document: null,
				error:
					error instanceof Error ? error.message : "Could not read this file",
			};
		}
	}, [source, extension]);

	if (parsed.error || !parsed.document) {
		return (
			<Stack align="center" justify="center" h="100%" p="md">
				<Text c="red" role="alert">
					{parsed.error ?? "Could not read this file"}
				</Text>
			</Stack>
		);
	}

	return documentView(parsed.document);
}

import { Anchor, type AnchorProps } from "@mantine/core";
import {
	Link as LinkImport,
	type LinkProps as LinkImportProps,
} from "react-router";

type InternalLinkProps = AnchorProps &
	LinkImportProps & {
		href?: undefined;
		to: LinkImportProps["to"];
		children?: React.ReactNode;
	};

type ExternalLinkProps = AnchorProps & {
	href: string;
	to?: undefined;
	target?: string;
	rel?: string;
	children?: React.ReactNode;
};

export type LinkProps = InternalLinkProps | ExternalLinkProps;

function externalRel(
	href: string,
	rel: string | undefined,
): string | undefined {
	if (!/^https?:/i.test(href)) return rel;
	const parts = new Set((rel ?? "").split(/\s+/).filter(Boolean));
	parts.add("noopener");
	parts.add("noreferrer");
	return [...parts].join(" ");
}

export default function Link(props: LinkProps) {
	if (props.href) {
		return (
			<Anchor
				component="a"
				{...props}
				rel={externalRel(props.href, props.rel)}
			/>
		);
	}
	if (props.to) {
		return <Anchor component={LinkImport} {...props} />;
	}
	return <Anchor {...props} />;
}

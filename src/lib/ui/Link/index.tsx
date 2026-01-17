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
  children?: React.ReactNode;
};

export type LinkProps = InternalLinkProps | ExternalLinkProps;

export default function Link(props: LinkProps) {
  if (props.href) {
    return <Anchor component="a" {...props} />;
  }
  if (props.to) {
    return <Anchor component={LinkImport} {...props} />;
  }
  return <Anchor {...props} />;
}

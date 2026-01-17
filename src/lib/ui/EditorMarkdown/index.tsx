import "@mantine/tiptap/styles.css";
import "katex/dist/katex.min.css";

import { ActionIcon, Container, Group, Paper } from "@mantine/core";
import { getTaskListExtension, Link, RichTextEditor } from "@mantine/tiptap";
import Blockquote from "@tiptap/extension-blockquote";
import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import Document from "@tiptap/extension-document";
import DragHandle from "@tiptap/extension-drag-handle-react";
import Emoji, { gitHubEmojis } from "@tiptap/extension-emoji";
import Heading from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import History from "@tiptap/extension-history";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import InvisibleCharacters from "@tiptap/extension-invisible-characters";
import Italic from "@tiptap/extension-italic";
import {
	BulletList,
	ListItem,
	OrderedList,
	TaskItem,
	TaskList,
} from "@tiptap/extension-list";
import Mathematics, { migrateMathStrings } from "@tiptap/extension-mathematics";
import NodeRange from "@tiptap/extension-node-range";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import Text from "@tiptap/extension-text";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import UniqueId from "@tiptap/extension-unique-id";
import { Markdown } from "@tiptap/markdown";
import { useEditor } from "@tiptap/react";
import {
	BubbleMenu as BubbleMenuComponent,
	FloatingMenu as FloatingMenuComponent,
} from "@tiptap/react/menus";

import Icon from "@/lib/ui/Icon";
import styles from "./styles.module.scss";

// TODO: Support for Table, Mermaid, Image (Inline)
// TODO: Optionally support Markdown Frontmatter, Fullscreen, Print/PDF
export default function EditorMarkdown(props: {
	defaultValue?: string;
	onChange?: (value?: string) => void;
}) {
	const editor = useEditor({
		shouldRerenderOnTransaction: true,
		immediatelyRender: false,
		extensions: [
			Blockquote,
			Bold,
			Code,
			CodeBlock,
			Document,
			Emoji.configure({
				emojis: gitHubEmojis,
				enableEmoticons: false,
				forceFallbackImages: false,
			}),
			// FileHandler,
			// HardBreak,
			Heading,
			Highlight,
			History,
			HorizontalRule,
			// Image,
			InvisibleCharacters.configure({
				visible: false,
			}),
			Italic,
			Link,
			NodeRange,
			Paragraph,
			Placeholder.configure({
				placeholder: "Type something...",
			}),
			BulletList,
			OrderedList,
			ListItem,
			getTaskListExtension(TaskList),
			TaskItem.configure({
				nested: true,
				HTMLAttributes: {
					class: "test-item",
				},
			}),
			Text,
			Typography,
			Underline,
			UniqueId,
			Mathematics,
			TableKit,
			Markdown,
			// StarterKit,
		],
		content: props.defaultValue,
		contentType: "markdown",
		onCreate: ({ editor: currentEditor }) => {
			migrateMathStrings(currentEditor);
		},
		onUpdate() {
			if (editor) {
				props.onChange?.(editor.getMarkdown());
			}
		},
	});

	if (!editor) {
		return (
			<div>
				<p>Processing...</p>
			</div>
		);
	}

	return (
		<RichTextEditor
			editor={editor}
			variant="subtle"
			withCodeHighlightStyles={false}
			withTypographyStyles={true}
			styles={{
				root: {
					border: "none",
				},
			}}
		>
			<DragHandle editor={editor}>
				<ActionIcon variant="subtle" color="gray">
					<Icon icon="edit" height={16} width={16} title="Icon Drag" />
				</ActionIcon>
			</DragHandle>
			<Container size="md">
				<RichTextEditor.Content className={styles.screenMarkdownContent} />
			</Container>
			<FloatingMenuComponent editor={editor}>
				<Paper withBorder shadow="xs">
					<RichTextEditor.ControlsGroup>
						<RichTextEditor.Hr />
						<RichTextEditor.CodeBlock />
						<RichTextEditor.TaskList />
					</RichTextEditor.ControlsGroup>
				</Paper>
			</FloatingMenuComponent>
			<BubbleMenuComponent editor={editor}>
				<Paper withBorder shadow="xs">
					<Group maw="70vw">
						<RichTextEditor.ControlsGroup>
							<RichTextEditor.Bold />
							<RichTextEditor.Italic />
							<RichTextEditor.Link />
						</RichTextEditor.ControlsGroup>
						<RichTextEditor.ControlsGroup>
							<RichTextEditor.H1 />
							<RichTextEditor.H2 />
						</RichTextEditor.ControlsGroup>
					</Group>
				</Paper>
			</BubbleMenuComponent>
		</RichTextEditor>
	);
}

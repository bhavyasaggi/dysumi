import "streamdown/styles.css";
import {
	ActionIcon,
	Button,
	Group,
	Paper,
	Progress,
	ScrollArea,
	Select,
	Stack,
	Text,
	Textarea,
} from "@mantine/core";
import {
	type ChangeEvent,
	type KeyboardEvent,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { Streamdown } from "streamdown";
import {
	useClearWebLlmChatMutation,
	useGetWebGpuQuery,
	useGetWebLlmChatQuery,
	useGetWebLlmModelQuery,
	useLoadWebLlmModelMutation,
	usePatchWebLlmSessionMutation,
	useResumeWebLlmModelQuery,
	useSendWebLlmChatMutation,
} from "@/lib/redux/queries/web-llm";
import Icon from "@/lib/ui/Icon";
import { ASSIST_MODELS, DEFAULT_ASSIST_MODEL } from "@/lib/webllm/models";
import styles from "./styles.module.scss";

type Bubble = { id: string; role: "user" | "assistant"; content: string };

function ChatBubble(props: {
	role: Bubble["role"];
	content: string;
	streaming?: boolean;
}) {
	const mine = props.role === "user";
	const streaming = Boolean(props.streaming);
	return (
		<Paper
			p="xs"
			radius="md"
			withBorder
			bg={
				mine
					? "var(--mantine-color-blue-light)"
					: "var(--mantine-color-default)"
			}
			ml={mine ? "xl" : 0}
			mr={mine ? 0 : "xl"}
		>
			{mine || !props.content ? (
				<Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
					{props.content || "…"}
				</Text>
			) : (
				<Streamdown
					className={styles.reply}
					mode={streaming ? "streaming" : "static"}
					isAnimating={streaming}
					animated={streaming}
					controls={false}
					lineNumbers={false}
					linkSafety={{ enabled: false }}
				>
					{props.content}
				</Streamdown>
			)}
		</Paper>
	);
}

export default function PanelAssist() {
	const bottomRef = useRef<HTMLDivElement>(null);
	const gpu = useGetWebGpuQuery();
	const model = useGetWebLlmModelQuery();
	const chat = useGetWebLlmChatQuery();
	const resume = useResumeWebLlmModelQuery();
	const [loadModel, loadState] = useLoadWebLlmModelMutation();
	const [sendChat] = useSendWebLlmChatMutation();
	const [patchSession] = usePatchWebLlmSessionMutation();
	const [clearChat] = useClearWebLlmChatMutation();
	const modelId = chat.data?.modelId || DEFAULT_ASSIST_MODEL;
	const draft = chat.data?.draft ?? "";
	const messages = chat.data?.messages;
	const sending = Boolean(chat.data?.sending);
	const ready = model.data?.loadedId === modelId;
	const loading =
		(loadState.isLoading && loadState.originalArgs?.modelId === modelId) ||
		(resume.isFetching && model.data?.requestedId === modelId);
	const loadError =
		model.data?.requestedId === modelId ? model.data.error : null;

	useEffect(() => {
		if (!messages?.length) return;
		bottomRef.current?.scrollIntoView({ block: "end" });
	}, [messages]);

	const onModel = useCallback(
		(value: string | null) => {
			if (!value) return;
			patchSession({ modelId: value }).catch(() => undefined);
		},
		[patchSession],
	);

	const onLoad = useCallback(() => {
		loadModel({ modelId }).catch(() => undefined);
	}, [loadModel, modelId]);

	const send = useCallback(() => {
		const content = draft.trim();
		if (!content || sending || !ready) return;
		sendChat({ content, history: messages ?? [] }).catch(() => undefined);
	}, [draft, messages, ready, sendChat, sending]);

	const onDraft = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			patchSession({ draft: event.currentTarget.value }).catch(() => undefined);
		},
		[patchSession],
	);

	const onDraftKey = useCallback(
		(event: KeyboardEvent<HTMLTextAreaElement>) => {
			if (event.key !== "Enter" || event.shiftKey) return;
			event.preventDefault();
			send();
		},
		[send],
	);

	const clear = useCallback(() => {
		clearChat().catch(() => undefined);
	}, [clearChat]);

	const current = ready && !loading;

	return (
		<Stack
			h="calc(100dvh - 1.8em - 29px)"
			gap="xs"
			p="xs"
			style={{ overflow: "hidden" }}
		>
			<Group wrap="nowrap" gap="xs">
				<Select
					aria-label="Local model"
					data={ASSIST_MODELS}
					value={modelId}
					onChange={onModel}
					disabled={loading || sending}
					allowDeselect={false}
					searchable
					nothingFoundMessage="No matching model"
					maxDropdownHeight={280}
					flex={1}
				/>
				<Button
					onClick={onLoad}
					loading={loading}
					disabled={gpu.data !== true || sending || current || loading}
				>
					{current ? "Ready" : "Load"}
				</Button>
				<ActionIcon
					variant="subtle"
					color="gray"
					aria-label="Clear chat"
					onClick={clear}
					disabled={sending || !messages?.length}
				>
					<Icon icon="trash-2" title="Clear chat" height={16} width={16} />
				</ActionIcon>
			</Group>
			{loading ? (
				<>
					<Progress
						value={model.data?.progress ?? 0}
						aria-label="Model download"
					/>
					<Text size="xs" c="dimmed" role="status">
						{model.data?.progressText || "Loading the model…"}
					</Text>
				</>
			) : null}
			{gpu.data === false ? (
				<Text size="sm" c="red" role="alert">
					This browser has no compatible GPU, so a local model cannot run.
				</Text>
			) : null}
			{loadError || chat.data?.error ? (
				<Text size="sm" c="red" role="alert">
					{loadError || chat.data?.error}
				</Text>
			) : null}
			<ScrollArea flex={1} offsetScrollbars>
				<Stack gap="xs" role="log" aria-label="Chat">
					{messages?.length ? (
						messages.map((item, index) => (
							<ChatBubble
								key={item.id}
								role={item.role}
								content={item.content}
								streaming={
									sending &&
									item.role === "assistant" &&
									index === messages.length - 1
								}
							/>
						))
					) : (
						<Text size="sm" c="dimmed">
							The model runs in this browser. Load one, then ask a question.
						</Text>
					)}
					<div ref={bottomRef} />
				</Stack>
			</ScrollArea>
			<Group align="flex-end" wrap="nowrap" gap="xs">
				<Textarea
					aria-label="Message"
					placeholder={ready ? "Message" : "Load a model to chat"}
					value={draft}
					onChange={onDraft}
					onKeyDown={onDraftKey}
					disabled={!ready || sending}
					autosize
					minRows={1}
					maxRows={4}
					flex={1}
				/>
				<Button
					onClick={send}
					disabled={!ready || sending || draft.trim().length === 0}
				>
					Send
				</Button>
			</Group>
		</Stack>
	);
}

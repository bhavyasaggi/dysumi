import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { useCallback } from "react";

const DRAFT_KEY = "__dysumi_drafts";

export function readDraftMap() {
	try {
		const value = JSON.parse(
			globalThis.localStorage.getItem(DRAFT_KEY) ?? "{}",
		);
		if (!value || typeof value !== "object") return {};
		const drafts: Record<string, string> = {};
		for (const [path, text] of Object.entries(value)) {
			if (typeof text === "string") drafts[path] = text;
		}
		return drafts;
	} catch {
		return {};
	}
}

function writeDraftMap(drafts: Record<string, string>) {
	try {
		globalThis.localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
	} catch {
		// The browser refused the write. The open editor still has the text.
	}
}

export const draftsApi = createApi({
	reducerPath: "draftsApi",
	baseQuery: fakeBaseQuery(),
	keepUnusedDataFor: 60 * 60 * 24,
	endpoints: (builder) => ({
		getDrafts: builder.query<Record<string, string>, void>({
			queryFn: () => ({ data: readDraftMap() }),
		}),
		setDraft: builder.mutation<
			{ saved: true },
			{ path: string; content: string }
		>({
			queryFn: ({ path, content }, api) => {
				const drafts = { ...readDraftMap(), [path]: content };
				writeDraftMap(drafts);
				api.dispatch(
					draftsApi.util.upsertQueryData("getDrafts", undefined, drafts),
				);
				return { data: { saved: true } };
			},
		}),
	}),
});

export const { useGetDraftsQuery, useSetDraftMutation } = draftsApi;

export function useUntitledDraft(path: string | undefined) {
	const { data } = useGetDraftsQuery();
	const [setDraft] = useSetDraftMutation();
	const save = useCallback(
		(content: string) => {
			if (!path?.includes(":")) return;
			setDraft({ path, content }).catch(() => undefined);
		},
		[path, setDraft],
	);
	const text = path?.includes(":") ? data?.[path] : undefined;
	return { text, save };
}

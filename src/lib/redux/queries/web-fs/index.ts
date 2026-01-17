import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";

export const webFsApi = createApi({
	reducerPath: "webFsApi",
	baseQuery: fakeBaseQuery(),
	tagTypes: [
		"DIRECTORY_RECENT",
		"DIRECTORY_STRUCTURE",
		"FILE_CONTENT",
		"FILE_METADATA",
	],
	endpoints: () => ({}),
});

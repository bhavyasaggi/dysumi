import { actionInterfacePushNotification } from "@/lib/redux/slices/interface";
import type { ReduxDispatch } from "@/lib/redux/store";
import { validateDirectoryName } from "@/lib/workers/file-worker-fs";

export function parentPath(path: string) {
	return path.split("/").slice(0, -1).join("/");
}

export function joinedPath(directory: string, name: string) {
	return `${directory}/${name}`;
}

export function failureMessage(error: unknown) {
	if (
		error &&
		typeof error === "object" &&
		"error" in error &&
		typeof error.error === "string"
	) {
		return error.error;
	}
	return "The file action failed";
}

export function askName(label: string, current = "") {
	const value = window.prompt(label, current);
	if (value == null) return null;
	const name = value.trim();
	const check = validateDirectoryName(name);
	if (!check.isValid) return { error: check.error ?? "Invalid name" };
	return { name };
}

export function acceptedName(
	result: ReturnType<typeof askName>,
	dispatch: ReduxDispatch,
) {
	if (!result) return null;
	if ("error" in result) {
		dispatch(
			actionInterfacePushNotification({
				tone: "error",
				title: result.error ?? "Invalid name",
			}),
		);
		return null;
	}
	return result.name;
}

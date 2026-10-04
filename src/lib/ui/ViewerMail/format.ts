import type { Address } from "postal-mime";

function formatMailbox(box: { name?: string; address?: string }): string {
	const name = box.name?.trim() ?? "";
	const email = box.address?.trim() ?? "";
	if (name && email) return `${name} <${email}>`;
	return name ? name : email;
}

export function formatAddress(address?: Address): string {
	if (!address) return "";
	if (address.group) {
		const members = address.group.map((member) => formatMailbox(member));
		return `${address.name} (${members.join(", ")})`;
	}
	return formatMailbox(address);
}

export function formatDate(value?: string): string {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleString();
}

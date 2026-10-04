import {
	model_list,
	type WebLlmModelRecord,
} from "@/lib/data/webllm-models.js";

const records: WebLlmModelRecord[] = model_list;

function vramLabel(mb: number | undefined) {
	if (mb == null) return "";
	if (mb >= 1024) {
		const gb = mb / 1024;
		const digits = gb >= 10 ? 0 : 1;
		return `${gb.toFixed(digits)} GB`;
	}
	return `${Math.round(mb)} MB`;
}

function option(record: WebLlmModelRecord) {
	const size = vramLabel(record.vram_required_MB);
	return {
		value: record.model_id,
		label: size ? `${record.model_id} · ${size}` : record.model_id,
	};
}

function bySize(left: WebLlmModelRecord, right: WebLlmModelRecord) {
	return (left.vram_required_MB ?? 0) - (right.vram_required_MB ?? 0);
}

const smaller = records
	.filter((record) => record.low_resource_required)
	.sort(bySize);
const larger = records
	.filter((record) => !record.low_resource_required)
	.sort(bySize);

export const ASSIST_MODELS = [
	{ group: "Smaller GPUs", items: smaller.map(option) },
	{ group: "Larger models", items: larger.map(option) },
];

export const DEFAULT_ASSIST_MODEL =
	smaller[0]?.model_id ?? records[0]?.model_id ?? "";

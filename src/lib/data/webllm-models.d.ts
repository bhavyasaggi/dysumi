export type WebLlmModelRecord = {
	model: string;
	model_id: string;
	model_lib: string;
	vram_required_MB?: number;
	low_resource_required?: boolean;
	required_features?: string[];
	overrides?: {
		context_window_size?: number;
	};
};

export const model_list: WebLlmModelRecord[];

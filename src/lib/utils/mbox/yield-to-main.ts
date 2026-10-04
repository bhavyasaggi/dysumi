export async function yieldToMain(): Promise<void> {
	const scheduler = (
		globalThis as { scheduler?: { yield?: () => Promise<void> } }
	).scheduler;
	if (scheduler?.yield) {
		await scheduler.yield();
		return;
	}
	await new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});
}

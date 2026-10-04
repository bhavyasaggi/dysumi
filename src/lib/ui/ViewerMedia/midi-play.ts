import type { MidiSong } from "@/lib/utils/midi/parse";

export function playMidi(song: MidiSong): { stop: () => void } {
	const context = new AudioContext();
	const master = context.createGain();
	master.gain.value = 0.15;
	master.connect(context.destination);
	const start = context.currentTime + 0.05;
	for (const note of song.notes) {
		const osc = context.createOscillator();
		const gain = context.createGain();
		osc.type = note.drum ? "square" : "triangle";
		osc.frequency.value = note.drum ? 180 : 440 * 2 ** ((note.midi - 69) / 12);
		const at = start + note.time;
		const until = at + note.duration;
		gain.gain.setValueAtTime(Math.max(0.001, note.velocity / 700), at);
		gain.gain.exponentialRampToValueAtTime(0.001, until);
		osc.connect(gain);
		gain.connect(master);
		osc.start(at);
		osc.stop(until + 0.02);
	}
	return {
		stop: () => {
			context.close().catch(() => undefined);
		},
	};
}

export interface MidiNote {
	time: number;
	duration: number;
	midi: number;
	velocity: number;
	drum: boolean;
}

export interface MidiSong {
	notes: MidiNote[];
	duration: number;
}

interface OpenNote {
	time: number;
	velocity: number;
}

function readUint(bytes: Uint8Array, offset: number, size: number): number {
	let value = 0;
	for (let index = 0; index < size; index += 1) {
		value = (value << 8) | (bytes[offset + index] ?? 0);
	}
	return value;
}

function readVar(
	bytes: Uint8Array,
	offset: number,
): { value: number; next: number } {
	let value = 0;
	let next = offset;
	for (let step = 0; step < 4; step += 1) {
		const byte = bytes[next] ?? 0;
		next += 1;
		value = (value << 7) | (byte & 0x7f);
		if ((byte & 0x80) === 0) break;
	}
	return { value, next };
}

function closeOpen(
	open: Map<string, OpenNote>,
	notes: MidiNote[],
	time: number,
) {
	for (const [key, start] of open) {
		const [channel, midi] = key.split(":");
		notes.push({
			time: start.time,
			duration: Math.max(0.05, time - start.time),
			midi: Number(midi),
			velocity: start.velocity,
			drum: channel === "9",
		});
	}
}

function readTrack(
	bytes: Uint8Array,
	span: { offset: number; length: number },
	division: number,
): MidiNote[] {
	const notes: MidiNote[] = [];
	const open = new Map<string, OpenNote>();
	let tempo = 500_000;
	let seconds = 0;
	let status = 0;
	let offset = span.offset;
	const end = span.offset + span.length;
	while (offset < end) {
		const delta = readVar(bytes, offset);
		offset = delta.next;
		seconds += (delta.value * tempo) / division / 1_000_000;
		let command = bytes[offset] ?? 0;
		if (command < 0x80) command = status;
		else {
			status = command;
			offset += 1;
		}
		const channel = command & 0x0f;
		const kind = command & 0xf0;
		if (kind === 0x80 || kind === 0x90) {
			const note = bytes[offset] ?? 0;
			const velocity = bytes[offset + 1] ?? 0;
			offset += 2;
			const key = `${channel}:${note}`;
			if (kind === 0x80 || velocity === 0) {
				const start = open.get(key);
				if (start) {
					notes.push({
						time: start.time,
						duration: Math.max(0.05, seconds - start.time),
						midi: note,
						velocity: start.velocity,
						drum: channel === 9,
					});
					open.delete(key);
				}
			} else {
				open.set(key, { time: seconds, velocity });
			}
			continue;
		}
		if (kind === 0xc0 || kind === 0xd0) {
			offset += 1;
			continue;
		}
		if (kind === 0xe0 || kind === 0xa0 || kind === 0xb0) {
			offset += 2;
			continue;
		}
		if (command === 0xff) {
			const type = bytes[offset] ?? 0;
			const size = readVar(bytes, offset + 1);
			if (type === 0x51 && size.value === 3) {
				tempo = readUint(bytes, size.next, 3);
			}
			offset = size.next + size.value;
			continue;
		}
		break;
	}
	closeOpen(open, notes, seconds);
	return notes;
}

export function parseMidi(bytes: Uint8Array): MidiSong {
	if (readUint(bytes, 0, 4) !== 0x4d_54_68_64) {
		throw new Error("This file is not a Standard MIDI file");
	}
	const division = readUint(bytes, 12, 2);
	if (division & 0x80_00) {
		throw new Error("SMPTE MIDI timing is not supported");
	}
	const ticks = division || 96;
	const notes: MidiNote[] = [];
	let offset = 14;
	while (offset + 8 <= bytes.length) {
		if (readUint(bytes, offset, 4) !== 0x4d_54_72_6b) break;
		const length = readUint(bytes, offset + 4, 4);
		notes.push(...readTrack(bytes, { offset: offset + 8, length }, ticks));
		offset += 8 + length;
	}
	notes.sort((left, right) => left.time - right.time);
	const last = notes.at(-1);
	return {
		notes,
		duration: last ? last.time + last.duration : 0,
	};
}

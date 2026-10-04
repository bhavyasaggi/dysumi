import { Button, Group, Loader, Text } from "@mantine/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseQueryError, useParseMidiQuery } from "@/lib/redux/queries/parse";
import { playMidi } from "./midi-play";
import styles from "./styles.module.scss";

function midiStamp(bytes: Uint8Array): string {
	let hash = bytes.length;
	const step = Math.max(1, Math.floor(bytes.length / 64));
	for (let index = 0; index < bytes.length; index += step) {
		hash = Math.imul(hash, 33) + (bytes[index] ?? 0);
	}
	return `${bytes.length}:${hash >>> 0}`;
}

function formatTime(seconds: number): string {
	const whole = Math.max(0, Math.floor(seconds));
	const minutes = Math.floor(whole / 60);
	const remain = whole % 60;
	return `${minutes}:${remain.toString().padStart(2, "0")}`;
}

export default function MidiPlayer({ bytes }: { bytes: Uint8Array }) {
	const stamp = useMemo(() => midiStamp(bytes), [bytes]);
	const parsed = useParseMidiQuery(
		{ stamp, bytes },
		{ skip: bytes.length === 0 },
	);
	const song = parsed.data ?? null;
	const parseError = parsed.isError
		? parseQueryError(parsed.error, "Could not read this MIDI file")
		: "";
	const stopRef = useRef<(() => void) | null>(null);
	const [playing, setPlaying] = useState(false);
	const [elapsed, setElapsed] = useState(0);
	const retry = useCallback(() => {
		parsed.refetch();
	}, [parsed]);

	useEffect(() => {
		if (!song) return;
		return () => {
			stopRef.current?.();
			stopRef.current = null;
		};
	}, [song]);

	const toggle = useCallback(() => {
		if (!song) return;
		if (stopRef.current) {
			stopRef.current();
			stopRef.current = null;
			setPlaying(false);
			return;
		}
		const started = performance.now();
		const playback = playMidi(song);
		stopRef.current = playback.stop;
		setPlaying(true);
		const timer = window.setInterval(() => {
			const next = (performance.now() - started) / 1000;
			setElapsed(next);
			if (next >= song.duration) {
				window.clearInterval(timer);
				playback.stop();
				if (stopRef.current === playback.stop) stopRef.current = null;
				setPlaying(false);
			}
		}, 200);
		const previous = stopRef.current;
		stopRef.current = () => {
			window.clearInterval(timer);
			previous();
		};
	}, [song]);

	return (
		<div className={styles.midi}>
			<Text c="white" fw={600}>
				MIDI
			</Text>
			{parsed.isUninitialized || parsed.isLoading ? (
				<Loader color="gray" role="status" aria-label="Loading…" />
			) : null}
			{parseError ? (
				<Text c="red" size="sm" role="alert">
					{parseError}
				</Text>
			) : (
				<Text c="gray" size="sm">
					{`${formatTime(elapsed)} / ${formatTime(song?.duration ?? 0)}`}
				</Text>
			)}
			<Group>
				{parseError ? (
					<Button variant="light" onClick={retry}>
						Try again
					</Button>
				) : (
					<Button disabled={!song} onClick={toggle}>
						{playing ? "Stop" : "Play"}
					</Button>
				)}
			</Group>
		</div>
	);
}

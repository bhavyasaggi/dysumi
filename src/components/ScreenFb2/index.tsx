import { FileState } from "@/components/FileState";
import { useBinaryFile } from "@/lib/files/use-binary-file";
import ViewerFb2 from "@/lib/ui/ViewerFb2";

export default function ScreenFb2() {
	const file = useBinaryFile();
	return (
		<FileState
			processing={file.processing}
			error={file.isUntitled ? "" : file.error}
			empty={!(file.processing || file.error || file.bytes?.length)}
			emptyLabel="No book to display"
			onRetry={file.retry}
		>
			{file.bytes ? <ViewerFb2 key={file.path} bytes={file.bytes} /> : null}
		</FileState>
	);
}

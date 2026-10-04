import { FileState } from "@/components/FileState";
import { useBinaryFile } from "@/lib/files/use-binary-file";
import ViewerDjvu from "@/lib/ui/ViewerDjvu";

export default function ScreenDjvu() {
	const file = useBinaryFile();
	return (
		<FileState
			processing={file.processing}
			error={file.isUntitled ? "" : file.error}
			empty={!(file.processing || file.error || file.bytes?.length)}
			emptyLabel="No DjVu document to display"
			onRetry={file.retry}
		>
			{file.bytes ? <ViewerDjvu key={file.path} bytes={file.bytes} /> : null}
		</FileState>
	);
}

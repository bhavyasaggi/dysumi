import { FileState } from "@/components/FileState";
import { useBinaryFile } from "@/lib/files/use-binary-file";
import ViewerChm from "@/lib/ui/ViewerChm";

export default function ScreenChm() {
	const file = useBinaryFile();
	return (
		<FileState
			processing={file.processing}
			error={file.isUntitled ? "" : file.error}
			empty={!(file.processing || file.error || file.bytes?.length)}
			emptyLabel="No help file to display"
			onRetry={file.retry}
		>
			{file.bytes ? <ViewerChm key={file.path} bytes={file.bytes} /> : null}
		</FileState>
	);
}

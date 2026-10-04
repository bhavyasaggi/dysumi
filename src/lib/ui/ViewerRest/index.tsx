import { useMemo } from "react";
import ViewerRequests from "@/lib/ui/ViewerRequests";
import { parseCurlFile } from "@/lib/utils/http/parseCurl";
import { parseHttpFile } from "@/lib/utils/http/parseHttp";

export default function ViewerRest({
	source,
	extension,
}: {
	source: string;
	extension?: string;
}) {
	const file = useMemo(
		() =>
			extension === "curl" ? parseCurlFile(source) : parseHttpFile(source),
		[extension, source],
	);
	return <ViewerRequests file={file} />;
}

import { useMemo } from "react";
import ViewerRequests from "@/lib/ui/ViewerRequests";
import { parseGraphQLFile } from "@/lib/utils/http/parseGraphQL";

export default function ViewerGraphQL({ source }: { source: string }) {
	const file = useMemo(() => parseGraphQLFile(source), [source]);
	return <ViewerRequests file={file} bodyLabel="Definition" />;
}

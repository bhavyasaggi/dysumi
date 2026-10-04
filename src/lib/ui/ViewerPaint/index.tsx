import { Image } from "@mantine/core";

interface ViewerPaintProps {
	src?: string;
	fileName?: string;
}

export default function ViewerPaint({ src, fileName }: ViewerPaintProps) {
	if (!src) return null;
	return (
		<Image
			src={src}
			alt={fileName ?? "Bitmap image"}
			fit="contain"
			w="100%"
			h="100%"
		/>
	);
}

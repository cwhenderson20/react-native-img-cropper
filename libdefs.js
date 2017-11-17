// @flow

declare type ResizedImageInfo = {
	path: string,
	uri: string,
	size?: number,
	name?: string,
};

declare module "react-native-image-resizer" {
	declare export default function createResizedImage(
		uri: string,
		width: number,
		height: number,
		format: "PNG" | "JPEG" | "WEBP",
		quality: number,
		rotation?: number,
		outputPath?: string
	): Promise<ResizedImageInfo>;
}

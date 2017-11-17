// @flow

export type ImageOffset = {
	x: number,
	y: number,
};

export type ImageSize = {
	width: number,
	height: number,
};

export type ImageCropData = {
	offset: ImageOffset,
	size: ImageSize,
	displaySize?: ?ImageSize,
	resizeMode?: ?any,
	rotation?: ?number,
};

export type ImageSource = {
	uri: string,
	height?: number,
	width?: number,
};

export type TouchEvent = {
	nativeEvent: {
		changedTouches: Array<*>,
		identifier: string,
		locationX: number,
		locationY: number,
		pageX: number,
		pageY: number,
		target: string,
		timestamp: number,
		touches: Array<*>,
	},
};

export type LayoutEvent = {
	nativeEvent: {
		contentOffset: ImageOffset,
		contentSize: ImageSize,
		layoutMeasurement: ImageSize,
	},
};

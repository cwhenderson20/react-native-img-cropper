// @flow

import * as React from "react";
import PropTypes from "prop-types";
import { Animated, Image, ScrollView, View, StyleSheet } from "react-native";
import type { StyleObj } from "react-native/Libraries/StyleSheet/StyleSheetTypes";
import type {
	ImageSource,
	ImageSize,
	ImageCropData,
	ImageOffset,
	TouchEvent,
	LayoutEvent,
} from "./types";

type ImageEditorProps = {
	image: ImageSource,
	imageSize: ImageSize,
	size: ImageSize,
	onTransformDataChange?: ImageCropData => any,
	style?: StyleObj,
};

type ImageEditorState = {
	rotation: number,
	rotationAnimated: any,
};

class ImageEditor extends React.Component<ImageEditorProps, ImageEditorState> {
	contentOffset: ImageOffset;
	maximumZoomScale: number;
	minimumZoomScale: number;
	scaledImageSize: ImageSize;
	horizontal: boolean;
	scrollView: ?any;
	lastTapTime: ?number;
	lastContentOffset: ImageOffset;
	lastContentSize: ImageSize;
	lastCropSize: ImageSize;

	static propTypes = {
		image: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
		imageSize: PropTypes.shape({
			width: PropTypes.number.isRequired,
			height: PropTypes.number.isRequired,
		}).isRequired,
		size: PropTypes.shape({
			width: PropTypes.number.isRequired,
			height: PropTypes.number.isRequired,
		}).isRequired,
		onTransformDataChange: PropTypes.func,
		style: View.propTypes.style,
	};

	constructor(props: ImageEditorProps) {
		super(props);

		this.state = {
			rotation: 0,
			rotationAnimated: new Animated.Value(0),
		};
	}

	componentWillMount() {
		// scale an image to the minimum size that is large enough to completely
		// fill the crop box.
		const widthRatio = this.props.imageSize.width / this.props.size.width;
		const heightRatio = this.props.imageSize.height / this.props.size.height;

		this.horizontal = widthRatio > heightRatio;

		if (this.horizontal) {
			this.scaledImageSize = {
				width: this.props.imageSize.width / heightRatio,
				height: this.props.size.height,
			};
		} else {
			this.scaledImageSize = {
				width: this.props.size.width,
				height: this.props.imageSize.height / widthRatio,
			};
		}

		this.lastContentSize = this.scaledImageSize;
		this.lastCropSize = this.props.size;

		// center the scaled image in the view
		this.contentOffset = {
			x: (this.scaledImageSize.width - this.props.size.width) / 2,
			y: (this.scaledImageSize.height - this.props.size.height) / 2,
		};
		this.lastContentOffset = this.contentOffset;

		// highest zoom level
		this.maximumZoomScale = Math.min(
			this.props.imageSize.width / this.scaledImageSize.width,
			this.props.imageSize.height / this.scaledImageSize.height
		);

		// lowest zoom level
		this.minimumZoomScale = Math.max(
			this.props.size.width / this.scaledImageSize.width,
			this.props.size.height / this.scaledImageSize.height
		);

		this.updateTransformData(
			this.contentOffset,
			this.scaledImageSize,
			this.props.size
		);
	}

	detectDoubleTap = (event: TouchEvent) => {
		const thisTapTime = event.nativeEvent.timestamp;

		if (this.lastTapTime && thisTapTime - this.lastTapTime <= 300) {
			this.resetZoom();
		}

		this.lastTapTime = thisTapTime;

		return false;
	};

	onScroll = (event: LayoutEvent) => {
		this.updateTransformData(
			event.nativeEvent.contentOffset,
			event.nativeEvent.contentSize,
			event.nativeEvent.layoutMeasurement
		);
	};

	reset(animateZoom?: boolean, animateRotation?: boolean) {
		this.resetZoom(animateZoom);
		this.resetRotation(animateRotation);
	}

	resetZoom(animated?: boolean = true) {
		this.scrollView &&
			this.scrollView.scrollResponderZoomTo({
				x: 0,
				y: 0,
				width: this.scaledImageSize.width,
				height: this.scaledImageSize.height,
				animated,
			});
	}

	resetRotation(animated?: boolean) {
		this.rotateImage(0, animated);
	}

	rotateImage(toValue?: number, animated?: boolean = true) {
		let toValueIsValid = false;
		let newValue = this.state.rotation + 90;

		if (toValue || toValue === 0) {
			if (Number.isInteger(toValue / 90)) {
				newValue = toValue;
				toValueIsValid = true;
			}
		}

		const normalizedNewValue = ((newValue / 90) % 4) * 90;

		const updateState = () => {
			this.setState({ rotation: normalizedNewValue }, () => {
				this.updateTransformData(
					this.lastContentOffset,
					this.lastContentSize,
					this.lastCropSize,
					normalizedNewValue
				);
				normalizedNewValue !== newValue &&
					this.state.rotationAnimated.setValue(normalizedNewValue);
			});
		};

		if (animated) {
			Animated.timing(this.state.rotationAnimated, {
				toValue: toValue && toValueIsValid ? normalizedNewValue : newValue,
				duration: 225,
				useNativeDriver: true,
			}).start(updateState);
		} else {
			this.state.rotationAnimated.setValue(newValue);
			updateState();
		}
	}

	updateTransformData(
		offset: ImageOffset,
		scaledImageSize: ImageSize,
		croppedImageSize: ImageSize,
		rotation?: number
	) {
		const offsetRatioX = offset.x / scaledImageSize.width;
		const offsetRatioY = offset.y / scaledImageSize.height;
		const sizeRatioX = croppedImageSize.width / scaledImageSize.width;
		const sizeRatioY = croppedImageSize.height / scaledImageSize.height;

		const cropData: ImageCropData = {
			offset: {
				x: this.props.imageSize.width * offsetRatioX,
				y: this.props.imageSize.height * offsetRatioY,
			},
			size: {
				width: this.props.imageSize.width * sizeRatioX,
				height: this.props.imageSize.height * sizeRatioY,
			},
			rotation:
				rotation !== undefined && rotation !== null
					? rotation
					: this.state.rotation,
		};

		this.lastContentOffset = offset;
		this.lastContentSize = scaledImageSize;
		this.lastCropSize = croppedImageSize;

		this.props.onTransformDataChange &&
			this.props.onTransformDataChange(cropData);
	}

	render() {
		const interpolatedRotation = this.state.rotationAnimated.interpolate({
			inputRange: [0, 360],
			outputRange: ["0deg", "360deg"],
		});

		return (
			<View
				onStartShouldSetResponder={this.detectDoubleTap}
				style={styles.hiddenOverflow}
			>
				<Animated.View
					style={{
						transform: [{ rotate: interpolatedRotation }],
					}}
				>
					<ScrollView
						ref={scrollView => (this.scrollView = scrollView)}
						alwaysBounceVertical={true}
						automaticallyAdjustContentInsets={false}
						contentOffset={this.contentOffset}
						decelerationRate="fast"
						horizontal={this.horizontal}
						maximumZoomScale={this.maximumZoomScale}
						minimumZoomScale={this.minimumZoomScale}
						onMomentumScrollEnd={this.onScroll}
						onScrollEndDrag={this.onScroll}
						showsHorizontalScrollIndicator={false}
						showsVerticalScrollIndicator={false}
						style={this.props.style}
						scrollEventThrottle={16}
						scrollsToTop={false}
					>
						<Image
							source={this.props.image}
							style={[this.scaledImageSize]}
							capInsets={{ top: 0.01, left: 0.01, bottom: 0.01, right: 0.01 }}
						/>
					</ScrollView>
				</Animated.View>
			</View>
		);
	}
}

export default ImageEditor;

const styles = StyleSheet.create({
	hiddenOverflow: { overflow: "hidden" },
});

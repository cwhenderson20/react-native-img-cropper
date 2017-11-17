// @flow

import * as React from "react";
import ImageResizer from "react-native-image-resizer";
import {
	Animated,
	CameraRoll,
	Easing,
	Image,
	ImageEditor,
	ImageStore,
	ScrollView,
	StyleSheet,
	Text,
	TouchableHighlight,
	View,
} from "react-native";
import type { StyleObj } from "react-native/Libraries/StyleSheet/StyleSheetTypes";

type ImageOffset = {
	x: number,
	y: number,
};

type ImageSize = {
	width: number,
	height: number,
};

type ImageCropData = {
	offset: ImageOffset,
	size: ImageSize,
	displaySize?: ?ImageSize,
	resizeMode?: ?any,
	rotation?: ?number,
};

type ImageSource = {
	uri: string,
	height?: number,
	width?: number,
};

type Props = {
	image: ImageSource,
	onCropImage?: (
		error: ?{ message: string },
		result?: { name: string, path: string, uri: string, size: number }
	) => any,
};

type State = {
	measuredSize: ?{
		width: number,
		height: number,
	},
	croppedImageURI: ?string,
	cropError: ?{ message: string },
	imageSize: ?{
		width: number,
		height: number,
	},
	keyAccumulator: number,
};

class SquareImageCropper extends React.Component<Props, State> {
	transformData: ?ImageCropData;
	imageCropper: ?ImageCropper;

	constructor(props: Props) {
		super(props);

		this.state = {
			measuredSize: null,
			croppedImageURI: null,
			cropError: null,
			imageSize: null,
			keyAccumulator: 0,
		};
	}

	componentDidMount() {
		this.updateImageSize();
	}

	componentWillReceiveProps(nextProps: Props) {
		if (!this.isSameSource(this.props.image, nextProps.image)) {
			this.transformData = null;
			this.setState(
				{
					imageSize: null,
					keyAccumulator: this.state.keyAccumulator + 1,
				},
				() => {
					this.updateImageSize();
				}
			);
		}
	}

	updateImageSize() {
		if (!this.props.image.width || !this.props.image.height) {
			this.getImageSize();
		} else {
			this.setState({
				imageSize: {
					width: this.props.image.width,
					height: this.props.image.height,
				},
			});
		}
	}

	render() {
		if (!this.state.measuredSize) {
			return (
				<View
					style={styles.container}
					onLayout={event => {
						const measuredWidth = event.nativeEvent.layout.width;

						if (!measuredWidth) {
							return;
						}

						this.setState({
							measuredSize: {
								width: measuredWidth,
								height: measuredWidth,
							},
						});
					}}
				/>
			);
		}

		return this.renderImageCropper();
	}

	renderImageCropper() {
		let error = null;

		if (
			!this.props.image ||
			!this.state.imageSize ||
			!this.state.measuredSize
		) {
			return <View style={styles.container} />;
		}

		if (this.state.cropError) {
			error = <Text>{this.state.cropError.message}</Text>;
		}

		return (
			<View style={styles.container}>
				<ImageCropper
					key={`imageCropper#${this.state.keyAccumulator}`}
					ref={imageCropper => (this.imageCropper = imageCropper)}
					image={this.props.image}
					imageSize={this.state.imageSize}
					size={this.state.measuredSize}
					style={[styles.imageCropper, this.state.measuredSize]}
					onTransformDataChange={data => (this.transformData = data)}
				/>
			</View>
		);
	}

	getImageSize() {
		if (this.props.image && this.props.image.uri) {
			if (typeof Image.getSize === "function") {
				Image.getSize(
					this.props.image.uri,
					(width, height) => {
						if (width && height) {
							this.setState({ imageSize: { width, height } });
						}
					},
					error => console.error(error)
				);
			} else {
				console.log("getImageSize is not available");
			}
		} else {
			console.log("Static assets not supported");
		}
	}

	isSameSource(currentSource: ImageSource, nextSource: ImageSource) {
		if (currentSource === nextSource) {
			return true;
		}

		if (currentSource && nextSource) {
			if (currentSource.uri && nextSource.uri) {
				return currentSource.uri === nextSource.uri;
			}
		}

		return false;
	}

	crop = () => {
		if (!this.props.image || !this.transformData || !this.state.measuredSize) {
			return;
		}

		const transformData = { ...this.transformData };
		const measuredSize = { ...this.state.measuredSize };

		ImageEditor.cropImage(
			this.props.image.uri,
			this.transformData,
			croppedImageURI => {
				ImageResizer.createResizedImage(
					croppedImageURI,
					// this.transformData.size.width,
					// this.transformData.size.height,
					measuredSize.width,
					measuredSize.height,
					"PNG",
					100,
					transformData.rotation
				).then(result => {
					this.setState({ croppedImageURI: result.uri });
					this.props.onCropImage && this.props.onCropImage(null, result);
					ImageStore.removeImageForTag(croppedImageURI);
				});
			},
			cropError => {
				this.setState({ cropError });
				this.props.onCropImage && this.props.onCropImage(cropError);
			}
		);
	};

	rotate = () => {
		if (!this.imageCropper) {
			return;
		}
		this.imageCropper.rotateImage();
	};

	reset = () => {
		const imageStoreTag = this.state.croppedImageURI;

		this.setState({
			croppedImageURI: null,
			cropError: null,
		});

		imageStoreTag && ImageStore.removeImageForTag(imageStoreTag);
	};

	clearImageFromStore = () => {
		this.state.croppedImageURI &&
			ImageStore.removeImageForTag(this.state.croppedImageURI);
	};
}

type ImageCropperProps = {
	image: ImageSource,
	imageSize: {
		width: number,
		height: number,
	},
	size: {
		width: number,
		height: number,
	},
	onTransformDataChange: ImageCropData => any,
	style?: StyleObj,
};

type ImageCropperState = {
	rotation: number,
	rotationAnimated: any,
};

class ImageCropper extends React.Component<
	ImageCropperProps,
	ImageCropperState
> {
	contentOffset: ImageOffset;
	maximumZoomScale: number;
	minimumZoomScale: number;
	scaledImageSize: ImageSize;
	horizontal: boolean;
	scrollView: ?any;
	lastTapTime: ?number;

	constructor(props: ImageCropperProps) {
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

		// center the scaled image in the view
		this.contentOffset = {
			x: (this.scaledImageSize.width - this.props.size.width) / 2,
			y: (this.scaledImageSize.height - this.props.size.height) / 2,
		};

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

	onScroll = event => {
		this.updateTransformData(
			event.nativeEvent.contentOffset,
			event.nativeEvent.contentSize,
			event.nativeEvent.layoutMeasurement
		);
	};

	updateTransformData(offset, scaledImageSize, croppedImageSize, rotation) {
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
			rotation: rotation || this.state.rotation,
		};

		this.props.onTransformDataChange &&
			this.props.onTransformDataChange(cropData);
	}

	resetZoom = () => {
		this.scrollView &&
			this.scrollView.scrollResponderZoomTo({
				x: 0,
				y: 0,
				width: this.scaledImageSize.width,
				height: this.scaledImageSize.height,
				animated: true,
			});
	};

	detectDoubleTap = event => {
		const thisTapTime = event.nativeEvent.timestamp;

		if (this.lastTapTime && thisTapTime - this.lastTapTime <= 300) {
			this.resetZoom();
		}

		this.lastTapTime = thisTapTime;

		return false;
	};

	rotateImage = () => {
		const newValue = this.state.rotation + 90;

		Animated.timing(this.state.rotationAnimated, {
			toValue: newValue,
			duration: 225,
			useNativeDriver: true,
		}).start(() => {
			this.setState({ rotation: newValue }, () => {
				this.updateTransformData(
					this.contentOffset,
					this.scaledImageSize,
					this.props.size
				);
			});
		});
	};

	render() {
		const interpolatedRotation = this.state.rotationAnimated.interpolate({
			inputRange: [0, 360],
			outputRange: ["0deg", "360deg"],
		});

		return (
			<View
				onStartShouldSetResponder={this.detectDoubleTap}
				style={{ overflow: "hidden" }}
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

export default SquareImageCropper;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignSelf: "stretch",
	},
	imageCropper: {
		alignSelf: "center",
	},
	cropButtonTouchable: {
		alignSelf: "center",
		marginTop: 12,
	},
	cropButton: {
		padding: 12,
		backgroundColor: "blue",
		borderRadius: 4,
	},
	cropButtonLabel: {
		color: "white",
		fontSize: 16,
		fontWeight: "500",
	},
});

const React = require("react");
const ReactNative = require("react-native");
const {
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
} = ReactNative;

const PAGE_SIZE = 20;

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
};

class SquareImageCropper extends React.Component {
	state: any;
	isMounted: boolean;
	transformData: ImageCropData;

	constructor(props) {
		super(props);

		this.state = {
			randomPhoto: null,
			measuredSize: null,
			croppedImageURI: null,
			cropError: null,
		};
	}

	async fetchRandomPhoto() {
		try {
			const data = await CameraRoll.getPhotos({ first: PAGE_SIZE });
			const edges = data.edges;
			const edge = edges[Math.floor(Math.random() * edges.length)];
			const randomPhoto = edge && edge.node && edge.node.image;

			if (randomPhoto) {
				this.setState({ randomPhoto });
			}
		} catch (error) {
			console.warn("Can't get a photo from camera roll", error);
		}
	}

	componentDidMount() {
		this.fetchRandomPhoto();
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
							measuredSize: { width: measuredWidth, height: measuredWidth },
						});
					}}
				/>
			);
		}

		if (!this.state.croppedImageURI) {
			return this.renderImageCropper();
		}

		return this.renderCroppedImage();
	}

	renderImageCropper() {
		let error = null;

		if (!this.state.randomPhoto) {
			return <View style={styles.container} />;
		}

		if (this.state.cropError) {
			error = <Text>{this.state.cropError.message}</Text>;
		}

		return (
			<View style={styles.container}>
				<Text>Drag the image within the square to crop:</Text>
				<ImageCropper
					ref={imageCropper => (this.imageCropper = imageCropper)}
					image={this.state.randomPhoto}
					size={this.state.measuredSize}
					style={[styles.imageCropper, this.state.measuredSize]}
					onTransformDataChange={data => (this.transformData = data)}
				/>
				<TouchableHighlight
					style={styles.cropButtonTouchable}
					onPress={this.crop}
				>
					<View style={styles.cropButton}>
						<Text style={styles.cropButtonLabel}>Crop</Text>
					</View>
				</TouchableHighlight>
				{error}
			</View>
		);
	}

	renderCroppedImage() {
		return (
			<View style={styles.container}>
				<Text>Here is the cropped image:</Text>
				<Image
					source={{ uri: this.state.croppedImageURI }}
					style={[styles.imageCropper, this.state.measuredSize]}
				/>
				<TouchableHighlight
					style={styles.cropButtonTouchable}
					onPress={this.reset}
				>
					<View style={styles.cropButton}>
						<Text style={styles.cropButtonLabel}>Try again</Text>
					</View>
				</TouchableHighlight>
			</View>
		);
	}

	crop = () => {
		ImageEditor.cropImage(
			this.state.randomPhoto.uri,
			this.transformData,
			croppedImageURI => {
				this.setState({ croppedImageURI });
				this.props.onCropImage && this.props.onCropImage(null, croppedImageURI);
			},
			cropError => {
				this.setState({ cropError });
				this.props.onCropImage && this.props.onCropImage(cropError);
			}
		);
	};

	reset = () => {
		const imageStoreTag = this.state.croppedImageURI;

		this.setState({
			randomPhoto: null,
			croppedImageURI: null,
			cropError: null,
		});
		this.fetchRandomPhoto();

		imageStoreTag && ImageStore.removeImageForTag(imageStoreTag);
	};

	rotate = () => {
		this.imageCropper.rotateImage();
	};

	clearImageFromStore = () => {
		this.state.croppedImageURI &&
			ImageStore.removeImageForTag(this.state.croppedImageURI);
	};
}

class ImageCropper extends React.Component {
	contentOffset: ImageOffset;
	maximumZoomScale: number;
	minimumZoomScale: number;
	scaledImageSize: ImageSize;
	horizontal: boolean;

	constructor(props) {
		super(props);

		this.state = {
			rotation: 0,
			rotationAnimated: new Animated.Value(0),
		};
	}

	componentWillMount() {
		// Scale an image to the minimum size that is large enough to completely
		// fill the crop box.
		const widthRatio = this.props.image.width / this.props.size.width;
		const heightRatio = this.props.image.height / this.props.size.height;

		this.horizontal = widthRatio > heightRatio;

		if (this.horizontal) {
			this.scaledImageSize = {
				width: this.props.image.width / heightRatio,
				height: this.props.size.height,
			};
		} else {
			this.scaledImageSize = {
				width: this.props.size.width,
				height: this.props.image.height / widthRatio,
			};
		}

		this.contentOffset = {
			x: (this.scaledImageSize.width - this.props.size.width) / 2,
			y: (this.scaledImageSize.height - this.props.size.height) / 2,
		};

		this.maximumZoomScale = Math.min(
			this.props.image.width / this.scaledImageSize.width,
			this.props.image.height / this.scaledImageSize.height
		);

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

	updateTransformData(offset, scaledImageSize, croppedImageSize) {
		const offsetRatioX = offset.x / scaledImageSize.width;
		const offsetRatioY = offset.y / scaledImageSize.height;
		const sizeRatioX = croppedImageSize.width / scaledImageSize.width;
		const sizeRatioY = croppedImageSize.height / scaledImageSize.height;

		const cropData: ImageCropData = {
			offset: {
				x: this.props.image.width * offsetRatioX,
				y: this.props.image.height * offsetRatioY,
			},
			size: {
				width: this.props.image.width * sizeRatioX,
				height: this.props.image.height * sizeRatioY,
			},
		};

		this.props.onTransformDataChange &&
			this.props.onTransformDataChange(cropData);
	}

	resetZoom = () => {
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

		if (this.lastTap && thisTapTime - this.lastTap <= 300) {
			this.resetZoom();
		}

		this.lastTap = thisTapTime;

		return false;
	};

	rotateImage = () => {
		const newValue = this.state.rotation + 90;

		Animated.timing(this.state.rotationAnimated, {
			toValue: newValue,
			duration: 225,
			useNativeDriver: true,
		}).start(() => {
			this.setState({ rotation: newValue });
		});
	};

	render() {
		const interpolatedRotation = this.state.rotationAnimated.interpolate({
			inputRange: [0, 360],
			outputRange: ["0deg", "360deg"],
		});

		return (
			<View onStartShouldSetResponder={this.detectDoubleTap}>
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
					<Animated.Image
						source={this.props.image}
						style={[
							this.scaledImageSize,
							{ transform: [{ rotate: interpolatedRotation }] },
						]}
						capInsets={{ top: 0.01, left: 0.01, bottom: 0.01, right: 0.01 }}
					/>
				</ScrollView>
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

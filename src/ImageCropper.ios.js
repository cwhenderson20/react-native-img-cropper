// @flow

import * as React from "react";
import PropTypes from "prop-types";
import ImageResizer from "react-native-image-resizer"; // eslint-disable-line import/no-unresolved, import/extensions
import {
	Image,
	ImageEditor as RNImageCropper,
	ImageStore,
	StyleSheet,
	View,
} from "react-native";
import ImageEditor from "./ImageEditor";
import type { ImageSource, ImageSize, ImageCropData } from "./types";

type Props = {
	image: ImageSource,
	onCropImage?: (
		error: ?{ message: string },
		result?: { name: string, path: string, uri: string, size: number }
	) => any,
};

type State = {
	measuredSize: ?ImageSize,
	croppedImageURI: ?string,
	cropError: ?{ message: string },
	imageSize: ?ImageSize,
	keyAccumulator: number,
};

class ImageCropper extends React.Component<Props, State> {
	transformData: ?ImageCropData;
	imageEditor: ?ImageEditor;

	static propTypes = {
		image: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
		onCropImage: PropTypes.func,
	};

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

	clearImageFromStore() {
		this.state.croppedImageURI &&
			ImageStore.removeImageForTag(this.state.croppedImageURI);
	}

	crop() {
		if (!this.props.image || !this.transformData || !this.state.measuredSize) {
			return;
		}

		const transformData = { ...this.transformData };
		const measuredSize = { ...this.state.measuredSize };

		RNImageCropper.cropImage(
			this.props.image.uri,
			this.transformData,
			croppedImageURI => {
				ImageResizer.createResizedImage(
					croppedImageURI,
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
	}

	getImageSize() {
		// TODO optimize this to check for existing dimensions
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

	reset(animateZoom?: boolean, animateRotation?: boolean) {
		this.clearImageFromStore();
		this.setState({
			croppedImageURI: null,
			cropError: null,
		});
		this.imageEditor && this.imageEditor.reset(animateZoom, animateRotation);
	}

	rotate() {
		if (!this.imageEditor) {
			return;
		}
		this.imageEditor.rotateImage();
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

		return this.renderImageEditor();
	}

	renderImageEditor() {
		if (
			!this.props.image ||
			!this.state.imageSize ||
			!this.state.measuredSize
		) {
			return <View style={styles.container} />;
		}

		return (
			<View style={styles.container}>
				<ImageEditor
					key={`imageEditor#${this.state.keyAccumulator}`}
					ref={imageEditor => (this.imageEditor = imageEditor)}
					image={this.props.image}
					imageSize={this.state.imageSize}
					size={this.state.measuredSize}
					style={[styles.imageEditor, this.state.measuredSize]}
					onTransformDataChange={data => (this.transformData = data)}
				/>
			</View>
		);
	}
}

export default ImageCropper;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignSelf: "stretch",
	},
	imageEditor: {
		alignSelf: "center",
	},
});

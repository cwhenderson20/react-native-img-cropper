/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */

import React, { Component } from "react";
import {
	Animated,
	Dimensions,
	Image,
	findNodeHandle,
	PanResponder,
	StyleSheet,
	Text,
	View,
} from "react-native";
import ReactNativeComponentTree from "react-native/Libraries/Renderer/shims/ReactNativeComponentTree";
import image from "./image.jpg";

const windowDimensions = Dimensions.get("window");
const imageDimensions = {
	width: 2352,
	height: 1882,
};
const imageContainerDimensions = {
	width: 300,
	height: 500,
};
const imageAspectRatio = imageDimensions.width / imageDimensions.height;
const imageContainerAspectRatio =
	imageContainerDimensions.width / imageContainerDimensions.height;

// the smaller content dimension must be at least as large as the larger container dimension
const scaleFactor =
	imageContainerAspectRatio > imageAspectRatio
		? imageContainerDimensions.width / imageDimensions.width
		: imageContainerDimensions.height / imageDimensions.height;
const maxScale = Math.max(
	Math.max(
		imageDimensions.width / imageContainerDimensions.width,
		imageDimensions.height / imageContainerDimensions.height
	),
	1
);
const imageContainerStyle = {
	width: imageContainerDimensions.width,
	height: imageContainerDimensions.height,
	backgroundColor: "transparent",
	overflow: "hidden",
	borderWidth: 1,
	borderColor: "red",
};
const imageStyle = {
	position: "absolute",
	top:
		(imageContainerDimensions.height - imageDimensions.height * scaleFactor) /
		2,
	left:
		(imageContainerDimensions.width - imageDimensions.width * scaleFactor) / 2,
	width: imageDimensions.width * scaleFactor,
	height: imageDimensions.height * scaleFactor,
	backgroundColor: "green",
};

export default class App extends Component<{}> {
	componentWillMount() {
		this.panResponder = PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onPanResponderGrant: this.handleGrant.bind(this),
			onPanResponderMove: this.handleMove.bind(this),
			onPanResponderRelease: this.handleEnd.bind(this),
		});
		this.prevLeft = 0;
		this.prevTop = 0;
		this.boxStyle = {
			left: this.prevLeft,
			top: this.prevTop,
		};
	}

	componentDidMount() {
		this.updatePosition();
	}

	updatePosition() {
		this.image.setNativeProps(this.boxStyle);
	}

	handleGrant() {
		if (!this.image) {
			this.forceUpdate(() => {
				if (!this.image) {
					return;
				}
				this.image.setNativeProps({
					opacity: 0.9,
				});
			});
		} else {
			this.image.setNativeProps({
				opacity: 0.9,
			});
		}
	}

	handleEnd(e, gestureState) {
		this.image.setNativeProps({
			opacity: 1,
		});
		this.prevLeft += gestureState.dx;
		this.prevTop += gestureState.dy;
	}

	handleMove(e, gestureState) {
		console.log("HANDLING MOVE");
		this.boxStyle.left = this.prevLeft + gestureState.dx;
		this.boxStyle.top = this.prevTop + gestureState.dy;
		this.updatePosition();
	}

	render() {
		return (
			<View style={styles.container}>
				<View style={imageContainerStyle}>
					<Animated.Image
						ref={image => (this.image = image)}
						source={image}
						style={imageStyle}
						resizeMode="contain"
						{...this.panResponder.panHandlers}
					/>
				</View>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#F5FCFF",
	},
});

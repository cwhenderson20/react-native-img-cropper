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
// import image from "./image.jpg";

console.log(image);

const windowDimensions = Dimensions.get("window");
const imageDimensions = {
	width: 2352,
	height: 1882,
};
const imageContainerDimensions = {
	width: 300,
	height: 400,
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
const imageScaledDimensions = {
	width: Math.round(imageDimensions.width * scaleFactor),
	height: Math.round(imageDimensions.height * scaleFactor),
};

const imageStyle = {
	position: "absolute",
	width: imageScaledDimensions.width,
	height: imageScaledDimensions.height,
	backgroundColor: "green",
};

export default class App extends Component<{}> {
	componentWillMount() {
		this.panResponder = PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onPanResponderTerminationRequest: () => true,
			onShouldBlockNativeResponder: () => true,
			onPanResponderGrant: this.handleGrant.bind(this),
			onPanResponderMove: this.handleMove.bind(this),
			onPanResponderRelease: this.handleEnd.bind(this),
		});
		this.scale = 1;
		this.prevScale = 1;
		this.prevLeft = Math.round(
			(imageContainerDimensions.width - imageScaledDimensions.width) / 2
		);
		this.prevTop = Math.round(
			(imageContainerDimensions.height - imageScaledDimensions.height) / 2
		);
		this.maxLeft = imageScaledDimensions.width - imageContainerDimensions.width;
		this.maxTop =
			imageScaledDimensions.height - imageContainerDimensions.height;
		this.boxStyle = {
			left: this.prevLeft,
			top: this.prevTop,
			transform: [{ scale: 1 }],
		};
	}

	componentDidMount() {
		this.updatePosition();
	}

	updatePosition() {
		this.image.setNativeProps(this.boxStyle);
	}

	handleGrant(e, gestureState) {
		console.log("handleGrant");

		if (!this.image) {
			this.forceUpdate(() => {
				if (!this.image) {
					return;
				}
			});
		}

		if (gestureState.numberActiveTouches === 2) {
			const dx = Math.abs(
				e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX
			);
			const dy = Math.abs(
				e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY
			);
			const initialDistance = Math.sqrt(dx ** 2 + dy ** 2);

			this.initialDistance = initialDistance;

			console.log("define initial distance:", initialDistance);
		}
	}

	handleEnd(e, gestureState) {
		// we're at the edge of the photo, nothing updated
		if (this.prevLeft > 0 || Math.abs(this.prevLeft) > this.maxLeft) {
			console.log("at bound");
			this.prevLeft = this.prevLeft;
		} else {
			console.log("not at bound");
			// the gesture will put us past the edge of the photo, so set the
			// bound as the edge toward which we are traveling
			if (
				this.prevLeft + gestureState.dx > 0 ||
				Math.abs(this.prevLeft + gestureState.dx) > this.maxLeft
			) {
				console.log("gesture past bound");
				this.prevLeft = gestureState.dx > 0 ? 0 : -this.maxLeft;
			} else {
				// the gesture keeps us within the bounds, just update the state
				console.log("within bound");
				this.prevLeft = this.prevLeft + gestureState.dx;
			}
		}

		if (this.prevTop > 0 || Math.abs(this.prevTop) > this.maxTop) {
			this.prevTop = this.prevTop;
		} else {
			if (
				this.prevTop + gestureState.dy > 0 ||
				Math.abs(this.prevTop + gestureState.dy) > this.maxTop
			) {
				this.prevTop = gestureState.dy > 0 ? 0 : -this.maxTop;
			} else {
				this.prevTop = this.prevTop + gestureState.dy;
			}
		}

		console.log("set prevScale:", this.scale);
		this.prevScale = this.scale;
		this.initialDistance = null;

		console.log("handleEnd");
	}

	handleMove(e, gestureState) {
		if (gestureState.numberActiveTouches === 1) {
			if (this.prevLeft > 0 || Math.abs(this.prevLeft) > this.maxLeft) {
				this.boxStyle.left = this.prevLeft;
			} else {
				if (
					this.prevLeft + gestureState.dx > 0 ||
					Math.abs(this.prevLeft + gestureState.dx) > this.maxLeft
				) {
					this.boxStyle.left = gestureState.dx > 0 ? 0 : -this.maxLeft;
				} else {
					this.boxStyle.left = this.prevLeft + gestureState.dx;
				}
			}
			if (this.prevTop > 0 || Math.abs(this.prevTop) > this.maxTop) {
				this.boxStyle.top = this.prevTop;
			} else {
				if (
					this.prevTop + gestureState.dy > 0 ||
					Math.abs(this.prevTop + gestureState.dy) > this.maxTop
				) {
					this.boxStyle.top = gestureState.dy > 0 ? 0 : -this.maxTop;
				} else {
					this.boxStyle.top = this.prevTop + gestureState.dy;
				}
			}
		}

		if (gestureState.numberActiveTouches === 2) {
			console.log("handleMove [zoom]");
			this.isZooming = true;

			const dx = Math.abs(
				e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX
			);
			const dy = Math.abs(
				e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY
			);
			const distance = Math.sqrt(dx ** 2 + dy ** 2);

			if (!this.initialDistance) {
				this.initialDistance = distance;
				console.log("set initialDistance (handleMove):", distance);
				return;
			}

			const scale = distance / this.initialDistance * this.prevScale;

			this.scale = scale;
			this.boxStyle.transform = [
				{
					scale,
				},
			];
		} else {
			if (this.isZooming) {
				this.initialDistance = null;
				this.prevScale = this.scale;
				this.isZooming = false;
			}
		}

		this.updatePosition();
	}

	render() {
		return (
			<View style={styles.container}>
				<View style={imageContainerStyle}>
					<Animated.Image
						ref={image => (this.image = image)}
						source={this.props.image}
						style={imageStyle}
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

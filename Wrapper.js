import * as React from "react";
import { View, TouchableHighlight, Text, StatusBar } from "react-native";
import ImageCropper from "./src/ImageCropper.ios";

const photo1 = {
	filename: "IMG_0004.JPG",
	height: 2500,
	isStored: true,
	playableDuration: 0,
	uri:
		"assets-library://asset/asset.JPG?id=99D53A1F-FEEF-40E1-8BB3-7DD55A43C8B7&ext=JPG",
	width: 1668,
};

const photo2 = {
	filename: "IMG_0001.JPG",
	height: 2848,
	isStored: true,
	playableDuration: 0,
	uri:
		"assets-library://asset/asset.JPG?id=106E99A1-4F6A-45A2-B320-B0AD4A8E8473&ext=JPG",
	width: 4288,
};

// const photo3 = {
// 	uri:
// 		"https://static01.nyt.com/images/2017/11/16/opinion/16welch/16welch-master768.jpg",
// };

export default class Wrapper extends React.Component<*, *> {
	constructor(props) {
		super(props);

		this.state = {
			photo: photo1,
		};
	}

	render() {
		return (
			<View style={{ flex: 1 }}>
				<StatusBar hidden={true} />
				<ImageCropper
					ref={i => (this.imageCropper = i)}
					image={this.state.photo}
					onCropImage={(err, result) => console.log(result.uri)}
				/>
				<TouchableHighlight onPress={() => this.imageCropper.crop()}>
					<View style={{ padding: 20, backgroundColor: "lightblue" }}>
						<Text>Crop</Text>
					</View>
				</TouchableHighlight>
				<TouchableHighlight onPress={() => this.imageCropper.reset()}>
					<View style={{ padding: 20, backgroundColor: "pink" }}>
						<Text>Reset</Text>
					</View>
				</TouchableHighlight>
				<TouchableHighlight onPress={() => this.imageCropper.rotate()}>
					<View style={{ padding: 20, backgroundColor: "lightgreen" }}>
						<Text>Rotate</Text>
					</View>
				</TouchableHighlight>
				<TouchableHighlight
					onPress={() =>
						this.setState({
							photo: this.state.photo === photo1 ? photo2 : photo1,
						})
					}
				>
					<View style={{ padding: 20, backgroundColor: "cyan" }}>
						<Text>Switch Photo</Text>
					</View>
				</TouchableHighlight>
			</View>
		);
	}
}

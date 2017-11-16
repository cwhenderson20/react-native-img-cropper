import * as React from "react";
import { View, TouchableHighlight, Text } from "react-native";
import ImageCropper from "./ImageCropper";

export default class Wrapper extends React.Component {
	render() {
		return (
			<View style={{ flex: 1 }}>
				<ImageCropper
					ref={i => (this.imageCropper = i)}
					onCropImage={(err, uri) => console.log(uri)}
				/>
				<TouchableHighlight onPress={() => this.imageCropper.crop()}>
					<View style={{ padding: 20, backgroundColor: "lightblue" }}>
						<Text>Crop External</Text>
					</View>
				</TouchableHighlight>
				<TouchableHighlight onPress={() => this.imageCropper.reset()}>
					<View style={{ padding: 20, backgroundColor: "pink" }}>
						<Text>Reset</Text>
					</View>
				</TouchableHighlight>
			</View>
		);
	}
}

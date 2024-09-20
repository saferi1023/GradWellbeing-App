import React, { useState } from "react";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, Alert, Image, TouchableOpacity, ScrollView, StyleSheet, Platform, TextInput} from "react-native";
import { icons } from "../../constants";
import { CustomButton, FormField } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";

import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const db = getFirestore();
const storage = getStorage();

const Create = () => {
  const { user } = useGlobalContext();
  const [uploading, setUploading] = useState(false);
  // const [form, setForm] = useState({
  //   fileType: "",
  //   date: new Date(),
  //   fileName: "",
  // });
  const [selectedOption, setSelectedOption] = useState("schedule");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const openPicker = async (selectType) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
    });

    if (!result.canceled) {
      if (selectType === "upload") {
        setFile(result.assets[0]);
        // setForm({
        //   ...form,
        //   // video: result.uri,
        //   fileName: result.name || "File is Selected!!!", // Use the file name or a default label
        // });
      }
    } else {
      setTimeout(() => {
        Alert.alert("Document picked", JSON.stringify(result, null, 2));
      }, 100);
    }
  };
  const uploadFile = async () => {
    if (!file) return null;

    const fileRef = ref(storage, `uploads/${user.uid}/${Date.now()}_${file.name}`);
    const response = await fetch(file.uri);
    const blob = await response.blob();

    await uploadBytes(fileRef, blob);

    return await getDownloadURL(fileRef);
  };

  const submit = async () => {
    if (!file) {
      return Alert.alert("Please provide all fields");
    }

    setUploading(true);
    try {
      const fileUrl = await uploadFile();

      if (!fileUrl) throw new Error("Failed to upload file");

      const fileData = {
        userId: user.uid,
        fileDate: date.toISOString().split('T')[0], // Convert date to 'YYYY-MM-DD' format
        fileUrl,
        fileType: selectedOption,
        desc,  
        createdAt: new Date().toISOString(),
      };

      const fileRef = doc(db, "uploads", `${user.uid}_${Date.now()}`);
      await setDoc(fileRef, fileData);

      Alert.alert("Success", "File uploaded successfully");
      router.push("/home");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      // setForm({
      //   date: new Date(), // Reset date
      //   prompt: "",
      // });
      setSelectedOption("schedule");
      setDesc("");
      setFile(null);
      setDate(new Date());
      setUploading(false);
    }
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === "ios"); // Keep the date picker open on iOS
    setDate(currentDate);

    if (Platform.OS === "android") {
      setShowDatePicker(false); // Close picker after selecting on Android
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView className="px-4 my-6">
        <Text className="text-2xl text-white font-psemibold">Upload File</Text>

{/* File Type Selection */}
        <View className="mt-7 space-y-2">
          <Text className="text-base text-gray-100 font-pmedium">
            File Type 
          </Text>

          <TouchableOpacity
            style={[
              styles.optionButton,
              selectedOption === "schedule" && styles.selectedOption,
            ]}
            onPress={() => setSelectedOption("schedule")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionText,
                selectedOption === "schedule" && styles.selectedOptionText,
              ]}
            >
              Schedule File
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              selectedOption === "transcript" && styles.selectedOption,
            ]}
            onPress={() => setSelectedOption("transcript")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionText,
                selectedOption === "transcript" && styles.selectedOptionText,
              ]}
            >
              Transcript File
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              selectedOption === "other" && styles.selectedOption,
            ]}
            onPress={() => setSelectedOption("other")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionText,
                selectedOption === "other" && styles.selectedOptionText,
              ]}
            >
              Others 
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conditionally Render TextInput for 'Others' */}
        {selectedOption === "other" && (
          <FormField
            title="Description"
            placeholder="Enter File Description...."
            onChangeText={(text) => setDesc(text)}
            value={desc}
            otherStyles="mt-7"
          />
        )}


{/* Date Picker Section */}
        <View className="mt-7 space-y-2">
          <Text className="text-base text-gray-100 font-pmedium">
            Date of the File
          </Text>

          <TouchableOpacity
            style={[
              styles.optionButton,
              styles.selectedOption,
            ]}
            onPress={showDatepicker}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionText,
                styles.selectedOptionText,
              ]}
            >
              {date.toDateString()}
            </Text>
          </TouchableOpacity>
          
          {showDatePicker && Platform.OS === "android" && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          {Platform.OS === "ios" && (
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={onDateChange}
              textColor="white"
              // style={{ font}}
              // style={{ width: '90%', backgroundColor: '#1E1E2D', borderRadius:20, padding:10, marginTop:20, justifyContent: "center" }} // Full width on iOS
            />
          )}
        </View>
{/* File Picker */}
        <View className="mt-7 space-y-2">
          <Text className="text-base text-gray-100 font-pmedium">
            Select File
          </Text>

          <TouchableOpacity onPress={() => openPicker("upload")}>
            {file ? (
              <View className="w-full h-40 rounded-2xl bg-black-100 border border-black-200 flex justify-center items-center">
                <Text className="text-sm text-gray-100 font-pmedium">
                  {file.name}
                </Text>
              </View>
            ) : (
              <View className="w-full h-40 px-4 bg-black-100 rounded-2xl border border-black-200 flex justify-center items-center">
                <Image
                  source={icons.upload}
                  resizeMode="contain"
                  alt="upload"
                  className="w-1/2 h-1/2"
                />
                <Text className="text-sm text-gray-100 font-pmedium">
                  Choose a file
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
{/* Submit Button */}
        <CustomButton
          title="Submit & Publish"
          handlePress={submit}
          containerStyles="mt-7"
          isLoading={uploading}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  optionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#1E1E2D", // Default background color
    marginHorizontal: 5,
    alignItems: "center",
  },
  selectedOption: {
    backgroundColor: "#FF9C01", // Same background color as the custom button
    opacity: 1, // Ensure full opacity for the selected option
  },
  optionText: {
    color: "#fff", // Default text color
    fontWeight: "bold",
  },
  selectedOptionText: {
    color: "#000", // Black color for selected option text
  },
  datePickerButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#333", // Background color for the date picker button
    alignItems: "center",
  },
  textInput: {
    backgroundColor: "#444",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
  },
});

export default Create;

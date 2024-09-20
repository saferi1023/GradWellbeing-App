import { useState } from "react";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Dimensions, Alert, Image } from "react-native";

import { images } from "../../constants";
import { CustomButton, FormField } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";

import { signInWithEmailAndPassword } from "firebase/auth";
import { FIREBASE_AUTH } from "../../app/_layout";
import { getCurrentLocationAndSave } from "../services/locationService";
import { checkLocationPermissions, requestLocationPermissions } from '../services/locationService';
import { setupBackgroundLocationTracking } from '../services/locationService';


const SignIn = () => {
  const { setUser, setIsLogged } = useGlobalContext();
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const submit = async () => {
    if (form.email === "" || form.password === "") {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setSubmitting(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        FIREBASE_AUTH,
        form.email,
        form.password
      );

      const user = userCredential.user;

      setUser(user); // Assuming setUser saves the user info to your global context
      setIsLogged(true);

      try{
        const checkAndRequestPermissions = async () => {
          const permissions = await checkLocationPermissions();
            if (!permissions.foreground || !permissions.background) {
              const granted = await requestLocationPermissions();
              if (granted) {
                console.log('Permissions granted');
              } else {
                console.log('Permissions denied');
              }
            }
        }
      } catch (locationPermissionError) {
        console.error("Error acquiring location permission:", locationPermissionError);
      }

      // Get and save the current location after successful login
      try {
        const location = await getCurrentLocationAndSave();
        if (location) {
          console.log("Location updated successfully");
        } else {
          console.log("Failed to update location");
        }
      } catch (locationError) {
        console.error("Error updating location:", locationError);
      }

      const startTracking = async () => {
        await setupBackgroundLocationTracking();
        // ... maybe update some UI to show tracking is active
      };

      router.replace("/home");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View
          className="w-full flex justify-center h-full px-4 my-6"
          style={{
            minHeight: Dimensions.get("window").height - 100,
          }}
        >
          <Image
            source={images.logo}
            resizeMode="contain"
            className="w-[115px] h-[34px]"
          />

          <Text className="text-2xl font-semibold text-white mt-10 font-psemibold">
            Log in to Aora
          </Text>

          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({ ...form, email: e })}
            otherStyles="mt-7"
            keyboardType="email-address"
          />

          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e) => setForm({ ...form, password: e })}
            otherStyles="mt-7"
          />

          <CustomButton
            title="Sign In"
            handlePress={submit}
            containerStyles="mt-7"
            isLoading={isSubmitting}
          />

          <View className="flex justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-100 font-pregular">
              Don't have an account?
            </Text>
            <Link
              href="/sign-up"
              className="text-lg font-psemibold text-secondary"
            >
              Signup
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;

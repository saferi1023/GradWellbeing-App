import { useState } from "react";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Dimensions, Alert, Image } from "react-native";

import { images } from "../../constants";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { FIREBASE_AUTH } from "../../app/_layout";
import { CustomButton, FormField } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";

import { getFirestore, doc, setDoc } from "firebase/firestore";

const db = getFirestore();

const SignUp = () => {
  const { setUser, setIsLogged } = useGlobalContext();

  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    fullname: "",
    program: "",
    area: "",
    email: "",
    password: "",
    signUpDate: new Date().toISOString(),  // Step 1: Add signUpDate to form state
  });

  const submit = async () => {
    if (form.username === "" || form.fullname === "" || form.program === "" || form.area === "" || form.email === "" || form.password === "") {
      Alert.alert("Error", "Please fill in all fields");
      return; // Add return here to stop further execution
    }

    setSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        FIREBASE_AUTH,
        form.email,
        form.password
      );
      const user = userCredential.user;
    
      // Save additional user info in Firestore including the date
      await setDoc(doc(db, "users", user.uid), {
        user_id: user.uid,
        username: form.username,
        fullname: form.fullname,
        program: form.program,
        area: form.area,
        email: form.email,
        signUpDate: form.signUpDate,  // Step 2: Include the sign-up date in Firestore
      });
    
      setUser(user); // Assuming setUser saves the user info to your global context
      setIsLogged(true);
    
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
            Sign Up to Aora
          </Text>

          <FormField
            title="Username"
            value={form.username}
            handleChangeText={(e) => setForm({ ...form, username: e })}
            otherStyles="mt-10"
          />

          <FormField
            title="Full Name"
            value={form.fullname}
            handleChangeText={(e) => setForm({ ...form, fullname: e })}
            otherStyles="mt-10"
          />

          <FormField
            title="Program"
            value={form.program}
            handleChangeText={(e) => setForm({ ...form, program: e })}
            otherStyles="mt-7"
            keyboardType="email-address"
          />

          <FormField
            title="Research Area"
            value={form.area}
            handleChangeText={(e) => setForm({ ...form, area: e })}
            otherStyles="mt-7"
            keyboardType="email-address"
          />

          <FormField
            title="Institute Email"
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
            title="Sign Up"
            handlePress={submit}
            containerStyles="mt-7"
            isLoading={isSubmitting}
          />

          <View className="flex justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-100 font-pregular">
              Have an account already?
            </Text>
            <Link
              href="/sign-in"
              className="text-lg font-psemibold text-secondary"
            >
              Login
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;

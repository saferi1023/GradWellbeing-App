import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity } from "react-native";
import * as Progress from 'react-native-progress'; // Import the library
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getFirestore, getDoc, doc } from "firebase/firestore";
import { useGlobalContext } from "../../context/GlobalProvider";
import { FIREBASE_AUTH } from "../_layout"; 

const db = getFirestore();

const Home = () => {
    const { user } = useGlobalContext();
    const [username, setUsername] = useState("");
    const [dueTasks, setDueTasks] = useState(0);
    const [totalTasks, setTotalTasks] = useState(0);
    const navigation = useNavigation();

    const fetchUserData = async () => {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            setUsername(data.username || "Grad Student");
        }
    };

    const fetchTasks = async () => {
        try {
            const userDoc = await getDoc(doc(db, "users", FIREBASE_AUTH.currentUser.uid));
            if (!userDoc.exists()) {
                console.error("User document not found.");
                return;
            }

            const userData = userDoc.data();
            const completedTasks = userData.completedTasks || []; 

            const allTasks = [
                { id: 1, task: "Upload your today's schedule" },
                { id: 2, task: "Upload Video Call Transcript with your advisor (If you had any)" },
                { id: 3, task: "Retrieve Emails and Chat Conversation" },
            ];

            const currentDate = new Date();
            const diffInDays = Math.floor((currentDate - new Date(FIREBASE_AUTH.currentUser.metadata.creationTime)) / (1000 * 60 * 60 * 24));
            if (diffInDays % 3 === 0) {
                allTasks.push({ id: 4, task: "Complete your Questionnaire" });
            }

            const dueTasks = allTasks.filter(task => !completedTasks.includes(task.id));
            console.log("Creation Date: ",FIREBASE_AUTH.currentUser.metadata.creationTime)
            console.log("Number of Tasks: ", dueTasks);

            setDueTasks(dueTasks.length);
            setTotalTasks(allTasks.length);
        } catch (error) {
            console.error("Error fetching tasks: ", error);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchUserData();
            fetchTasks();
        }, [])
    );

    const progress = totalTasks > 0 ? (totalTasks - dueTasks) / totalTasks : 0;

    return (
        <SafeAreaView className="bg-primary h-full">
            <View className="flex my-6 px-4 space-y-6">
                <View className="flex justify-between items-start flex-row mb-6">
                    <View>
                        <Text className="font-pmedium text-sm text-gray-100">
                            Welcome Back
                        </Text>
                        <Text className="text-2xl font-psemibold text-white">
                            {username}
                        </Text>
                    </View>
                </View>

                {/* Progress Box */}
                <TouchableOpacity 
                    className="bg-secondary-100 w-9/10 shadow-lg p-4 rounded-full flex flex-row items-center"
                    onPress={() => navigation.navigate('tasks')}
                >
                    {/* Outer View to simulate an outer border */}
                    <View style={{ 
                        position: 'relative',
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: 80, 
                        height: 80 
                    }}>
                        {/* Inner View to simulate the inner border */}
                        <View style={{ 
                            position: 'absolute',
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            width: 70, 
                            height: 70, 
                            borderRadius: 35, 
                            backgroundColor: '#161622', 
                            borderWidth: 4, 
                            // borderColor: '#FFFFFF' // Inner border color
                        }}>
                            <Progress.Circle 
                                size={150} 
                                thickness={30} 
                                progress={progress}
                                textStyle={{ color: '#fff', fontSize: 16, fontWeight:'bold' }} 
                                showsText={true}
                                color="#FF8E01" // Progress bar color changed to green
                                unfilledColor="#333" // Background color
                                borderWidth={6} // Outer border width
                                borderColor="#161622" // Outer border color
                                animated={true}
                                strokeCap="round"
                            />
                        </View>
                    </View>
                    
                    <View className="ml-14">
                        <Text className="text-xl text-center justify-right text-right font-psemibold">
                            {dueTasks} tasks due
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default Home;

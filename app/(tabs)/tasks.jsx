import React, { useState, useEffect } from "react";
import { SafeAreaView, View, Text, ScrollView, Alert, TouchableOpacity, StyleSheet } from "react-native";
import CheckBox from 'expo-checkbox';
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { useGlobalContext } from "../../context/GlobalProvider";
import { FIREBASE_AUTH } from "../_layout";

const db = getFirestore();

const TodoTab = () => {
  const { user } = useGlobalContext();
  const [tasks, setTasks] = useState([]);
  const [isQuestionnaireDay, setIsQuestionnaireDay] = useState(false);

  useEffect(() => {
    const fetchSignUpDate = async () => {
      try {
        const currentUser = FIREBASE_AUTH.currentUser;
        if (currentUser) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const signUpDateString = data.signUpDate;
            const dateObject = new Date(signUpDateString);
            calculateTasks(dateObject);

            // Fetch last reset date and completed tasks
            const lastResetDateString = data.lastResetDate;
            const lastResetDate = new Date(lastResetDateString);

            const currentDate = new Date();
            if (
              lastResetDate.getDate() !== currentDate.getDate() ||
              lastResetDate.getMonth() !== currentDate.getMonth() ||
              lastResetDate.getFullYear() !== currentDate.getFullYear()
            ) {
              resetTasks();
              await setDoc(doc(db, "users", currentUser.uid), { lastResetDate: currentDate.toISOString() }, { merge: true });
            }

            if (data.completedTasks) {
              const completedTasks = data.completedTasks;
              setTasks((prevTasks) =>
                prevTasks.map((task) => ({
                  ...task,
                  completed: completedTasks.includes(task.id),
                }))
              );
            }
          }
        }
      } catch (error) {
        Alert.alert("Error fetching sign-up date:", error.message);
      }
    };

    const calculateTasks = (signUpDate) => {
      const currentDate = new Date();
      const diffInDays = Math.floor((currentDate - signUpDate) / (1000 * 60 * 60 * 24));

      const dailyTasks = [];
      dailyTasks.push({ id: 1, task: "Upload your today's schedule", completed: false });
      dailyTasks.push({ id: 2, task: "Upload Video Call Transcript with your advisor (If you had any)", completed: false });
      dailyTasks.push({ id: 3, task: "Retrieve Emails and Chat Conversation", completed: false });
      //   { id: 1, task: "Upload your today's schedule", completed: false },
      //   { id: 2, task: "Upload Video Call Transcript with your advisor \n(If you had any)", completed: false },
      //   { id: 3, task: "Retrieve Emails and Chat Conversation", completed: false },
      // ];

      // Add questionnaire task if it's a questionnaire day
      if (diffInDays % 3 === 0) {
        dailyTasks.push({ id: 4, task: "Complete your Questionnaire", completed: false });
        setIsQuestionnaireDay(true);
      } else {
        setIsQuestionnaireDay(false);
      }

      setTasks(dailyTasks);
    };

    const resetTasks = () => {
      const newTasks = [];
      newTasks.push({ id: 1, task: "Upload your today's schedule", completed: false });
      newTasks.push({ id: 2, task: "Upload Video Call Transcript with your advisor (If you had any)", completed: false });
      newTasks.push({ id: 3, task: "Retrieve Emails and Chat Conversation", completed: false });
      //   { id: 1, task: "Upload your today's schedule", completed: false },
      //   { id: 2, task: "Upload Video Call Transcript with your advisor (If you had any)", completed: false },
      //   { id: 3, task: "Retrieve Emails and Chat Conversation", completed: false },
      // ];

      // Add questionnaire task if today is a questionnaire day
      const currentDate = new Date();
      const diffInDays = Math.floor((currentDate - new Date(FIREBASE_AUTH.currentUser.metadata.creationTime)) / (1000 * 60 * 60 * 24));
      if (diffInDays % 3 === 0) {
        newTasks.push({ id: 4, task: "Complete your Questionnaire", completed: false });
        setIsQuestionnaireDay(true);
      } else {
        setIsQuestionnaireDay(false);
      }

      setTasks(newTasks);
    };

    fetchSignUpDate();
  }, [user.uid]);

  const toggleTaskCompletion = async (taskId) => {
    setTasks((prevTasks) => {
      const updatedTasks = prevTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      );

      // Update Firestore with the current task completion status
      const currentUser = FIREBASE_AUTH.currentUser;
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const completedTasks = updatedTasks.filter(task => task.completed).map(task => task.id);
        setDoc(userDocRef, { completedTasks }, { merge: true });
      }

      return updatedTasks;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* <Text style={styles.title}>Today's Tasks</Text> */}
        <Text className="text-2xl text-white font-psemibold">Today's Tasks</Text>

        {/* <View style={styles.taskContainer}> */}
        <View className="mt-7 space-y-2 ">
          <View className="w-full space-y-5 rounded-2xl bg-black-100 border border-black-200 flex justify-left items-left">
            {tasks.map((task) => (
              <View key={task.id} style={styles.task}>
                <TouchableOpacity
                  style={[styles.checkboxContainer, task.completed && styles.completedTask]}
                  onPress={() => toggleTaskCompletion(task.id)}
                  activeOpacity={0.7}
                >
                  <CheckBox
                    value={task.completed}
                    onValueChange={() => toggleTaskCompletion(task.id)}
                    color={task.completed ? '#FF9C01' : '#FF9C01'} // Use your theme's secondary color
                  />
                  <Text style={[styles.taskText, task.completed && styles.completedTaskText]}>
                    {task.task}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161622', // Primary background color
  },
  scrollView: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF', // White text color
    fontWeight: '600', // Semi-bold text
  },
  taskContainer: {
    marginTop: 24,
  },
  task: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E2D', // Task background color
    padding: 12,
    borderRadius: 8,
  },
  completedTask: {
    backgroundColor: '#444', // Slightly darker color for completed tasks
  },
  taskText: {
    fontSize: 20,
    // fontWeight: "bold",
    color: '#FFFFFF', // White text color
    marginLeft: 12,
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    color: '#888', // Dimmed color for completed tasks
  },
});

export default TodoTab;

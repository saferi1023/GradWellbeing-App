import React, { useState } from "react";
import { SafeAreaView, View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { FIREBASE_AUTH } from "../_layout";
import { useGlobalContext } from "../../context/GlobalProvider";

const storage = getStorage();
const db = getFirestore();

const Ques = () => {
    const { user } = useGlobalContext();
    const [uploading, setUploading] = useState(false);
    const [responses, setResponses] = useState({
        perceivedStress: Array(6).fill(null),
        peerSupport: Array(5).fill(null),
        supervision: Array(5).fill(null),
        infrastructure: Array(5).fill(null),
        intellectualClimate: Array(5).fill(null),
    });

    const [currentSet, setCurrentSet] = useState(0);

    const handleSelect = (category, index, value) => {
        setResponses((prevResponses) => {
            const updatedResponses = { ...prevResponses };
            updatedResponses[category][index] = value;
            return updatedResponses;
        });
    };

    const allQuestionsAnswered = (category) => {
        return responses[category].every(response => response !== null);
    };

    const handleNext = () => {
        if (allQuestionsAnswered(questionSets[currentSet].category)) {
            if (currentSet < 4) {
                setCurrentSet(currentSet + 1);
            }
        } else {
            Alert.alert("Incomplete", "Please answer all the questions before proceeding to the next set.");
        }
    };

    const handlePrevious = () => {
        if (currentSet > 0) {
            setCurrentSet(currentSet - 1);
        }
    };

    const uploadFile = async (jsonData, fileName) => {
        try {
            const fileRef = ref(storage, `uploads/${user.uid}/${fileName}`);
            
            // Create a blob from the JSON string
            const blob = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.onload = function() {
                    resolve(xhr.response);
                };
                xhr.onerror = function(e) {
                    reject(new TypeError('Network request failed'));
                };
                xhr.responseType = 'blob';
                xhr.open('GET', URL.createObjectURL(new Blob([jsonData], {type: 'application/json'})), true);
                xhr.send(null);
            });

            // Upload the blob
            await uploadBytes(fileRef, blob);

            // Don't forget to revoke the blob URL
            if (Platform.OS !== 'web') {
                URL.revokeObjectURL(blob);
            }

            return await getDownloadURL(fileRef);
        } catch (error) {
            console.error("File upload error:", error);
            throw error;
        }
    };

    const handleSubmit = async () => {

        if (!allQuestionsAnswered(questionSets[currentSet].category)) {
            Alert.alert("Incomplete", "Please answer all the questions before submitting.");
            return;
        }

        const timestamp = new Date().toISOString();
        const responsesWithTimestamp = {
            timestamp,
            responses,
        };
    
        try {
            console.log("Starting submission process...");
            setUploading(true);
    
            // Create a JSON string from the responses
            const jsonData = JSON.stringify(responsesWithTimestamp);
            console.log("JSON Data Created:", jsonData);
    
            const fileName = `responses_${timestamp}.json`;
    
            // Upload the JSON data
            const fileUrl = await uploadFile(jsonData, fileName);
            if (!fileUrl) throw new Error("Failed to upload file");
    
            // Store file metadata in Firestore's uploads collection
            const fileData = {
                userId: user.uid,
                fileDate: new Date().toISOString().split('T')[0],
                fileUrl,
                fileType: 'JSON Questionnaire File',
                desc: 'User Questionnaire Responses',
                createdAt: timestamp,
            };
    
            const fileRef = doc(db, "uploads", `${user.uid}_${Date.now()}`);
            await setDoc(fileRef, fileData);
            console.log("Metadata stored in Firestore");
    
            Alert.alert("Success", "Responses submitted and uploaded successfully.");
        } catch (error) {
            console.error("Submission error:", error);
            Alert.alert("Error", "An error occurred while submitting your responses. Please try again.");
        } finally {
            setUploading(false);
            setCurrentSet(0);
            setResponses({
                perceivedStress: Array(6).fill(null),
                peerSupport: Array(5).fill(null),
                supervision: Array(5).fill(null),
                infrastructure: Array(5).fill(null),
                intellectualClimate: Array(5).fill(null),
            });
        }
    };

  const questionSets = [
    {
      title: "Perceived Stress",
      scale: "(5-point Likert scale: 0 = never, 4 = very often)",
      questions: [
        "Recently, how often have you felt nervous and ‘stressed’?",
        "Recently, how often have you found that you could not cope with all the things that you had to do?",
        "Recently, how often have you been angered because of things that happened that were outside of your control?",
        "Recently, how often have you found yourself thinking about things that you have to accomplish?",
        "Recently, how often have you been unable to control the way you spend your time?",
        "Recently, how often have you felt difficulties were piling up so high that you could not overcome them?",
      ],
      category: "perceivedStress",
      options: [0, 1, 2, 3, 4],
    },
    {
      title: "Peer Support",
      scale: "(5-point Likert scale: 1 = strongly disagree, 5 = strongly agree)",
      questions: [
        "I am actively in contact with other graduate students.",
        "I have identified a suitable peer group of fellow graduate students.",
        "I get sufficient support from other graduate students.",
        "I actively take part in the activities of the academic community in my field.",
        "I get sufficient support from the surrounding academic society regarding my studies.",
      ],
      category: "peerSupport",
      options: [1, 2, 3, 4, 5],
    },
    {
      title: "Supervision",
      scale: "(5-point Likert scale: 1 = strongly disagree, 5 = strongly agree)",
      questions: [
        "Supervision is available when I need it.",
        "My supervisor(s) provide(s) me with additional information relevant to my topic.",
        "My supervisor(s) provide(s) helpful feedback on my progress.",
        "I am given good guidance in topic selection and refinement.",
        "Overall, I am satisfied with the quality of my supervision.",
      ],
      category: "supervision",
      options: [1, 2, 3, 4, 5],
    },
    {
      title: "Infrastructure",
      scale: "(5-point Likert scale: 1 = strongly disagree, 5 = strongly agree)",
      questions: [
        "I have access to a suitable working space.",
        "I have good access to the technical support I need.",
        "I am able to organize good access to necessary equipment.",
        "I have access to a common room or a similar type of meeting place.",
        "Overall, I am satisfied with the quality of the services and facilities.",
      ],
      category: "infrastructure",
      options: [1, 2, 3, 4, 5],
    },
    {
      title: "Intellectual Climate",
      scale: "(5-point Likert scale: 1 = strongly disagree, 5 = strongly agree)",
      questions: [
        "I am provided with opportunities for social contact with other research students.",
        "I feel integrated into the faculty community.",
        "I am provided with opportunities to become involved in the broader research culture.",
        "The research ambience in the faculty stimulates my work.",
        "Research students are provided with a supportive working environment.",
      ],
      category: "intellectualClimate",
      options: [1, 2, 3, 4, 5],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <Text style={styles.title}>Baseline JD-R Model-Based Questionnaire</Text>

        <Text style={styles.subtitle}>{questionSets[currentSet].title}</Text>

        <Text className="text-base text-gray-100 font-pregular color-secondary-200">{questionSets[currentSet].scale}</Text>
        {questionSets[currentSet].questions.map((question, index) => (
          <View key={index} style={styles.questionContainer}>
            <View style={styles.indexQues}>
              <Text style={styles.indexNumber}>{index + 1}.</Text>
              <Text style={styles.question}>{question}</Text>
            </View>
            <View style={styles.optionsContainer}>
              {questionSets[currentSet].options.map((value) => (
                <TouchableOpacity 
                  key={value} 
                  onPress={() => handleSelect(questionSets[currentSet].category, index, value)} 
                  style={[
                    styles.radioButton, 
                    responses[questionSets[currentSet].category][index] === value && styles.selectedCircle
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionLabel}>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.buttonContainer}>
          {currentSet > 0 && (
            <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
              <Text style={styles.previousButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          {currentSet < 4 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161622',
  },
  scrollView: {
    paddingHorizontal: 16,
  },
  scrollContentContainer: {
    paddingVertical: 24,
    paddingBottom: 100, // Add extra space at the bottom to ensure scrolling works well
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 20,
    color: '#FF9C01',
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  questionContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  indexNumber: {
    color: '#FF9C01', // Secondary color for index numbers
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
  },
  question: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  indexQues: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  radioButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 25,
    width: 50,
    height: 50,
    backgroundColor: '#333',
  },
  selectedCircle: {
    backgroundColor: '#FF9001', // Secondary-100 color for selected item
  },
  optionLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  previousButton: {
    backgroundColor: '#FF9C01',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  previousButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },
  nextButton: {
    backgroundColor: '#FF9C01',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  nextButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },
  submitButton: {
    backgroundColor: '#FF9C01',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  submitButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default Ques;

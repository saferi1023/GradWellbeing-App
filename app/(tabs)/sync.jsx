import React, { useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AuthSession from 'expo-auth-session';
import * as FileSystem from 'expo-file-system';
import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useGlobalContext } from "../../context/GlobalProvider";
import { CustomButton } from "../../components";
// import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc, doc, setDoc } from "firebase/firestore";
// import { , uploadBytes, getDownloadURL } from "firebase/storage";
// import { db, storage } from "./firebaseConfig"; // Make sure to import your Firebase config


const clientId = '88ce521f-b064-42c6-bdd7-114669cdc298';
// const tenantId = 'a36450eb-db06-42a7-8d1b-026719f701e3';
const scopes = ['User.Read', 'Chat.Read', 'Mail.Read', 'Calendars.Read'];

const db = getFirestore();
const storage = getStorage();

const SyncTab = () => {
  const { user } = useGlobalContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [accountName, setAccountName] = useState(null);
  const [potentialSupervisors, setPotentialSupervisors] = useState([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState([]);
  const [savedSupervisors, setSavedSupervisors] = useState([]);
  const [supervisorsVisible, setSupervisorsVisible] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailsSaved, setEmailsSaved] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const db = getFirestore();

  const signIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const redirectUri = "exp://10.136.20.231:8081";
      
      const authRequest = new AuthSession.AuthRequest({
        clientId,
        scopes,
        redirectUri,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      });

      const discovery = {
        authorizationEndpoint: "https://login.microsoftonline.com/a36450eb-db06-42a7-8d1b-026719f701e3/oauth2/v2.0/authorize",
        tokenEndpoint: "https://login.microsoftonline.com/a36450eb-db06-42a7-8d1b-026719f701e3/oauth2/v2.0/token",
      };

      const result = await authRequest.promptAsync(discovery, { useProxy: true });

      if (result.type === 'success' && result.params.code) {
        const tokenResponse = await fetch(discovery.tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: clientId,
            scope: scopes.join(' '),
            code: result.params.code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            code_verifier: authRequest.codeVerifier,
          }).toString(),
        });

        const tokenResult = await tokenResponse.json();
        if (tokenResponse.ok) {
          setAccessToken(tokenResult.access_token);
          await fetchAccountName(tokenResult.access_token);
        } else {
          setError('Failed to obtain access token');
        }
      } else {
        setError('Authentication failed');
      }
    } catch (error) {
      setError("Sign-in failed");
    }

    setLoading(false);
  };

  const fetchAccountName = async (token) => {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAccountName(data.displayName);
      } else {
        setError('Failed to fetch account information');
      }
    } catch (error) {
      setError('Failed to fetch account information');
    }
  };

  const fetchChats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/chats', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const chats = await response.json();
        const oneOnOneChatIds = chats.value
          .filter(chat => chat.chatType === 'oneOnOne')
          .map(chat => chat.id);

        const displayNamesMap = new Map();

        for (const chatId of oneOnOneChatIds) {
          const messages = await fetchMessages(chatId);
          const displayNames = new Set();

          messages.forEach(message => {
            if (message.from && message.from.user && message.from.user.displayName) {
              displayNames.add(message.from.user.displayName);
            }
          });

          displayNames.forEach(name => {
            if (displayNamesMap.has(name)) {
              displayNamesMap.get(name).push(chatId);
            } else {
              displayNamesMap.set(name, [chatId]);
            }
          });
        }

        const potentialSupervisors = [];
        let userDisplayName = null;

        displayNamesMap.forEach((chatIds, name) => {
          if (chatIds.length === oneOnOneChatIds.length) {
            userDisplayName = name;
          } else {
            potentialSupervisors.push({ name, chatIds });
          }
        });

        setPotentialSupervisors(potentialSupervisors);
        setSupervisorsVisible(true);
      } else {
        setError('Failed to retrieve chats');
      }
    } catch (error) {
      setError('Failed to retrieve chats');
    }

    setLoading(false);
  };

  const fetchMessages = async (chatId) => {
    let allMessages = [];
    let nextLink = `https://graph.microsoft.com/v1.0/me/chats/${chatId}/messages?$top=50`;

    while (nextLink && allMessages.length < 100) {
      try {
        const response = await fetch(nextLink, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          allMessages = allMessages.concat(data.value);
          nextLink = data['@odata.nextLink'] || null;
        } else {
          setError('Error fetching messages');
          break;
        }
      } catch (error) {
        setError('Error fetching messages');
        break;
      }
    }

    return allMessages;
  };

  const saveMessages = async (messages, supervisor) => {
    const fileUri = `${FileSystem.documentDirectory}chat_messages_${supervisor.name}.json`;

    try {
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(messages, null, 4));
      setSavedSupervisors(prev => [...prev, supervisor.name]);
    } catch (err) {
      setError('Error saving messages');
    }
  };

  const handleSupervisorSelection = (supervisor) => {
    if (selectedSupervisors.includes(supervisor)) {
      setSelectedSupervisors(selectedSupervisors.filter(item => item !== supervisor));
    } else {
      setSelectedSupervisors([...selectedSupervisors, supervisor]);
    }
  };

  const handleSaveMessages = async () => {
    for (const supervisor of selectedSupervisors) {
      for (const chatId of supervisor.chatIds) {
        const messages = await fetchMessages(chatId);
        await saveMessages(messages, supervisor);
      }
    }
    setSupervisorsVisible(false);
  };

  const fetchAndSaveEmails = async () => {
    setEmailLoading(true);

    try {
      const selectedDateString = selectedDate.toISOString().split('T')[0];
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages?$filter=receivedDateTime ge ${selectedDateString}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const emails = await response.json();
        const fileUri = `${FileSystem.documentDirectory}emails_${selectedDateString}.json`;
        console.log('File saved at:', fileUri);
        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(emails, null, 4));
        setEmailsSaved(true);
      } else {
        setError('Failed to retrieve emails');
      }
    } catch (error) {
      setError('Error fetching emails');
    } finally {
      setEmailLoading(false);
    }
  };

  const fetchAndSaveSchedule = async () => {
    setScheduleLoading(true);

    try {
      const selectedDateString = selectedDate.toISOString().split('T')[0];
      const todayStart = `${selectedDateString}T00:00:00Z`;
      const todayEnd = `${selectedDateString}T23:59:59Z`;

      const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${todayStart}&endDateTime=${todayEnd}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const schedule = await response.json();
        const fileUri = `${FileSystem.documentDirectory}schedule_${selectedDateString}.json`;

        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(schedule, null, 4));
        setScheduleSaved(true);
      } else {
        setError('Failed to retrieve schedule');
      }
    } catch (error) {
      setError('Error fetching schedule');
    } finally {
      setScheduleLoading(false);
    }
  };

  const uploadFilesToFirestore = async () => {
    setUploadingFiles(true);
    console.log('Upload started');
  
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
      console.log('Files to upload:', files);
  
      const filteredFiles = files.filter(fileName => !fileName.startsWith('.'));
  
      for (const fileName of filteredFiles) {
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  
        try {
          const fileContent = await FileSystem.readAsStringAsync(fileUri);
          const jsonData = JSON.parse(fileContent);
  
          // Determine the file type based on the file name or content
          let fileType = '';
          if (fileName.includes('chat')) {
            fileType = 'chat';
          } else if (fileName.includes('emails')) {
            fileType = 'emails';
          } else if (fileName.includes('schedule')) {
            fileType = 'schedule';
          } else {
            fileType = 'unknown';
          }
  
          // Upload the file to Firebase Storage
          const fileRef = ref(storage, `uploads/${user.uid}/${Date.now()}_${fileName}`);
          const response = await fetch(fileUri);
          const blob = await response.blob();
          await uploadBytes(fileRef, blob);
  
          // Get the download URL of the uploaded file
          const fileUrl = await getDownloadURL(fileRef);
  
          // Extract the date from the file name or assign the current date
          const fileDate = new Date().toISOString(); // You might want to parse this from the file name or content if available
  
          // Create the metadata to store in Firestore
          const fileData = {
            userId: user.uid,
            fileDate,
            fileUrl,
            fileType,
            desc: fileName,
            createdAt: new Date().toISOString(),
          };
  
          // Store the metadata in Firestore
          const fileMetaRef = doc(db, "uploads", `${user.uid}_${Date.now()}`);
          await setDoc(fileMetaRef, fileData);
  
          console.log(`File uploaded and metadata saved: ${fileName}`);
          await FileSystem.deleteAsync(fileUri);
          console.log(`File deleted: ${fileName}`);
        } catch (fileError) {
          console.error(`Error processing file ${fileName}:`, fileError);
        }
      }
  
      Alert.alert('Success', 'All files have been uploaded and deleted locally.');
      resetPage();
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Error uploading files to Firestore');
    } finally {
      setUploadingFiles(false);
      console.log('Upload process finished');
    }
  };
  
  

  const resetPage = () => {
    setAccessToken(null);
    setAccountName(null);
    setSelectedSupervisors([]);
    setSavedSupervisors([]);
    setEmailsSaved(false);
    setScheduleSaved(false);
    setSupervisorsVisible(true);
  };

  const onDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full p-4">
      <ScrollView>
        <Text className="text-2xl text-white font-psemibold">Sync Today's Activity</Text>
      
        {/* Section 1: Sign In */}
        <View className="mt-7 space-y-2">
          <Text className="text-base text-gray-100 font-pmedium">1. Login to your FSU Email</Text>
          {loading && !accessToken ? (
            <ActivityIndicator size="large" color="#FF9C01" />
          ) : accessToken ? (
            <View className="mt-4 flex-row items-center justify-center space-x-2">
              <FontAwesome name="check" size={16} color="#FF9C01" />
              <Text className="text-gray-100">Signed in as {accountName}</Text>
            </View>
          ) : (
            <TouchableOpacity className="bg-secondary p-3 rounded-md" onPress={signIn}>
              <Text className="text-black text-center font-pbold">Sign In</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="mt-7 space-y-2">
          <Text className="text-base text-gray-100 font-pmedium">2. Retrieve Chat messages with your advisor</Text>
          {accessToken && (
            <>
              {loading && accessToken ? (
                <ActivityIndicator size="large" color="#FF9C01" />
              ) : (
                <>
                  <TouchableOpacity className="mt-4 bg-secondary p-3 rounded-md" onPress={fetchChats}>
                    <Text className="text-black text-center font-pbold">Fetch Chats</Text>
                  </TouchableOpacity>
                  {supervisorsVisible && potentialSupervisors.length > 0 && (
                    <View className="mt-4 space-y-2">
                      {/* Instructions */}
                      {/* <Text className="text-base text-gray-100 font-pregular color-secondary-200"> */}
                      <Text className="text-gray-100 color-secondary-200">
                        Select your advisor from the list below to save chat messages (**You can select more than one if there are senior/project manager who assign tasks to you.)
                      </Text>
                      {/* Potential Supervisors List */}
                      {potentialSupervisors.map((supervisor, index) => (
                        <TouchableOpacity
                          key={index}
                          className={`p-3 rounded-md mb-2 ${selectedSupervisors.includes(supervisor) ? 'bg-secondary' : 'bg-black-100'}`}
                          onPress={() => handleSupervisorSelection(supervisor)}
                        >
                          <Text className="text-gray-100 text-center">
                            {supervisor.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity className="bg-secondary p-3 rounded-md mt-4" onPress={handleSaveMessages}>
                        <Text className="text-black text-center font-pbold">Save Selected Messages</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {savedSupervisors.length > 0 && (
                    <View className="mt-4 space-y-2">
                      {savedSupervisors.map((name, index) => (
                        <View key={index} className="flex-row items-center justify-center space-x-2">
                          <FontAwesome name="check" size={16} color="#FF9C01" />
                          <Text className="text-gray-100">Messages with {name} have been saved</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>


        {/* Section 3: Retrieve Emails by Date */}
        <View className="mt-7 space-y-2">
          <Text className="text-base text-gray-100 font-pmedium">3. Retrieve Emails</Text>
          {accessToken && (
            <>
              <TouchableOpacity className="bg-black-100 p-3 rounded-md" onPress={() => setShowDatePicker(true)}>
                <Text className="text-gray-100 text-center">{selectedDate.toDateString()}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  textColor="white"
                />
              )}
              {emailLoading ? (
                <ActivityIndicator size="large" color="#FF9C01" />
              ) : (
                <TouchableOpacity className="bg-secondary p-3 rounded-md" onPress={fetchAndSaveEmails}>
                  <Text className="text-black text-center font-pbold">Retrieve Emails</Text>
                </TouchableOpacity>
              )}
              {emailsSaved && (
                <View className="mt-4 flex-row items-center justify-center space-x-2">
                  <FontAwesome name="check" size={16} color="#FF9C01" />
                  <Text className="text-gray-100">Emails from {selectedDate.toDateString()} have been saved</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Section 4: Retrieve Schedule by Date */}
        <View className="mt-7 space-y-2">
          <Text className="text-base text-gray-100 font-pmedium">4. Schedule by Date</Text>
          {accessToken && (
            <>
              <TouchableOpacity className="bg-black-100 p-3 rounded-md" onPress={() => setShowDatePicker(true)}>
                <Text className="text-gray-100 text-center">{selectedDate.toDateString()}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  textColor="white"
                />
              )}
              {scheduleLoading ? (
                <ActivityIndicator size="large" color="#FF9C01" />
              ) : (
                <TouchableOpacity className="bg-secondary p-3 rounded-md" onPress={fetchAndSaveSchedule}>
                  <Text className="text-black text-center font-pbold">Retrieve Schedule</Text>
                </TouchableOpacity>
              )}
              {scheduleSaved && (
                <View className="mt-4 flex-row items-center justify-center space-x-2">
                  <FontAwesome name="check" size={16} color="#FF9C01" />
                  <Text className="text-gray-100">Schedule for {selectedDate.toDateString()} has been saved</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Submit Button */}
        {accessToken && (
          <View className="mt-7 space-y-2">
            <TouchableOpacity className="bg-secondary p-3 rounded-md" onPress={uploadFilesToFirestore}>
              <Text className="text-black text-center font-pbold">
                {uploadingFiles ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  'Submit & Upload All Files'
                )}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SyncTab;

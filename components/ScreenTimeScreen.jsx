import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useHealth } from '../context/HealthProvider';

const ScreenTimeScreen = () => {
  const { screenTimeData } = useHealth();

  return (
    <ScrollView>
      <View>
        <Text>Screen Time Data</Text>
        {screenTimeData.length > 0 ? (
          screenTimeData.map((data, index) => (
            <View key={index}>
              <Text>{data}</Text>
            </View>
          ))
        ) : (
          <Text>No screen time data available</Text>
        )}
      </View>
    </ScrollView>
  );
};

export default ScreenTimeScreen;

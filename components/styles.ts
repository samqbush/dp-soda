// Add the missing styles here so we can import them
import { StyleSheet } from 'react-native';

export const emergencyStyles = StyleSheet.create({
  emergencyStopButton: {
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  emergencyStopButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  }
});

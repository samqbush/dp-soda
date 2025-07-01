import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HeaderImage } from '@/components/HeaderImage';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAppSettings } from '@/contexts/SettingsContext';

export default function WindGuruScreen() {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');
  const { settings } = useAppSettings();
  
  // State for collapsible sections
  const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);

  // Show disabled message if Wind Guru is not enabled
  if (!settings.windGuruEnabled) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={[styles.disabledContainer, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.disabledTitle}>🔒 Wind Guru Disabled</ThemedText>
          <ThemedText style={styles.disabledText}>
            The Wind Guru tab is currently disabled. This experimental feature provides advanced katabatic wind predictions but is still in development.
          </ThemedText>
          <ThemedText style={[styles.disabledText, { marginTop: 16 }]}>
            To enable Wind Guru:
          </ThemedText>
          <ThemedText style={styles.disabledSteps}>
            1. Go to the Settings tab{'\n'}
            2. Find &quot;App Features&quot; section{'\n'}
            3. Toggle &quot;Wind Guru Tab&quot; to enabled{'\n'}
            4. Return to this tab to access the feature
          </ThemedText>
          <ThemedView style={[styles.warningNote, { backgroundColor: 'rgba(255, 149, 0, 0.1)', borderColor: '#FF9500' }]}>
            <ThemedText style={[styles.warningText, { color: '#FF9500' }]}>
              ⚠️ <ThemedText style={{ fontWeight: 'bold' }}>Experimental Feature</ThemedText>
            </ThemedText>
            <ThemedText style={[styles.warningText, { color: textColor, opacity: 0.8 }]}>
              Wind predictions may not be reliable for critical decisions. Use at your own discretion.
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Image */}
        <HeaderImage 
          title="Wind Guru - Morrison, CO"
          subtitle="Server-Based Wind Prediction"
        />

        {/* Server Migration Notice */}
        <ThemedView style={[styles.migrationCard, { backgroundColor: cardColor }]}>
          <ThemedText style={[styles.migrationTitle, { color: tintColor }]}>
            🚀 Moving to Server-Based Predictions
          </ThemedText>
          <ThemedText style={[styles.migrationText, { color: textColor }]}>
            Wind Guru is being converted to a server-based solution for improved performance and accuracy.
          </ThemedText>
          <ThemedText style={[styles.migrationSubtext, { color: textColor, opacity: 0.7 }]}>
            Advanced katabatic wind predictions will be processed on our servers and delivered directly to your device.
          </ThemedText>
        </ThemedView>

        {/* Placeholder Content */}
        <ThemedView style={[styles.placeholderCard, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.placeholderTitle}>🔧 Under Development</ThemedText>
          <ThemedText style={[styles.placeholderText, { color: textColor, opacity: 0.8 }]}>
            Server infrastructure is being built to provide:
          </ThemedText>
          <ThemedView style={styles.featureList}>
            <ThemedText style={[styles.featureItem, { color: textColor }]}>• Real-time katabatic wind analysis</ThemedText>
            <ThemedText style={[styles.featureItem, { color: textColor }]}>• 5-factor hybrid MKI predictions</ThemedText>
            <ThemedText style={[styles.featureItem, { color: textColor }]}>• Today & tomorrow forecasts</ThemedText>
            <ThemedText style={[styles.featureItem, { color: textColor }]}>• Historical verification data</ThemedText>
            <ThemedText style={[styles.featureItem, { color: textColor }]}>• Enhanced evening analysis</ThemedText>
          </ThemedView>
        </ThemedView>

        {/* How It Will Work - Collapsible Section */}
        <ThemedView style={[styles.infoCard, { backgroundColor: cardColor }]}>
          <TouchableOpacity 
            onPress={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)}
            activeOpacity={0.7}
            style={styles.collapsibleHeader}
          >
            <ThemedView style={styles.headerContent}>
              <ThemedText style={styles.sectionTitle}>🧠 How Server Predictions Will Work</ThemedText>
              <ThemedText style={[styles.expandIcon, { color: tintColor }]}>
                {isHowItWorksExpanded ? '▼' : '▶'}
              </ThemedText>
            </ThemedView>
            <ThemedText style={[styles.collapsibleHint, { color: textColor, opacity: 0.6 }]}>
              {isHowItWorksExpanded ? 'Tap to collapse' : 'Tap to learn about our server-based approach'}
            </ThemedText>
          </TouchableOpacity>
          
          {isHowItWorksExpanded && (
            <ThemedView style={styles.infoContent}>
              <ThemedText style={[styles.infoText, { color: textColor, opacity: 0.9 }]}>
                The server-based Wind Guru will provide <ThemedText style={styles.highlightText}>enhanced accuracy</ThemedText> and <ThemedText style={styles.highlightText}>faster performance</ThemedText> by processing weather data on dedicated servers.
              </ThemedText>
              
              <ThemedView style={styles.benefitsList}>
                <ThemedView style={styles.benefitItem}>
                  <ThemedText style={styles.benefitEmoji}>⚡</ThemedText>
                  <ThemedView style={styles.benefitContent}>
                    <ThemedText style={[styles.benefitName, { color: textColor }]}>Faster Processing</ThemedText>
                    <ThemedText style={[styles.benefitDesc, { color: textColor, opacity: 0.7 }]}>Server-side calculations eliminate device processing delays</ThemedText>
                  </ThemedView>
                </ThemedView>
                
                <ThemedView style={styles.benefitItem}>
                  <ThemedText style={styles.benefitEmoji}>🎯</ThemedText>
                  <ThemedView style={styles.benefitContent}>
                    <ThemedText style={[styles.benefitName, { color: textColor }]}>Improved Accuracy</ThemedText>
                    <ThemedText style={[styles.benefitDesc, { color: textColor, opacity: 0.7 }]}>Access to more comprehensive weather datasets and models</ThemedText>
                  </ThemedView>
                </ThemedView>
                
                <ThemedView style={styles.benefitItem}>
                  <ThemedText style={styles.benefitEmoji}>🔄</ThemedText>
                  <ThemedView style={styles.benefitContent}>
                    <ThemedText style={[styles.benefitName, { color: textColor }]}>Real-time Updates</ThemedText>
                    <ThemedText style={[styles.benefitDesc, { color: textColor, opacity: 0.7 }]}>Continuous weather monitoring and prediction updates</ThemedText>
                  </ThemedView>
                </ThemedView>
                
                <ThemedView style={styles.benefitItem}>
                  <ThemedText style={styles.benefitEmoji}>💾</ThemedText>
                  <ThemedView style={styles.benefitContent}>
                    <ThemedText style={[styles.benefitName, { color: textColor }]}>Enhanced Caching</ThemedText>
                    <ThemedText style={[styles.benefitDesc, { color: textColor, opacity: 0.7 }]}>Smart server-side caching for optimal performance</ThemedText>
                  </ThemedView>
                </ThemedView>
              </ThemedView>
              
              <ThemedView style={[styles.serverFeatures, { borderColor: tintColor, borderWidth: 1 }]}>
                <ThemedText style={[styles.featuresTitle, { color: tintColor }]}>🌟 New Server Features</ThemedText>
                <ThemedText style={[styles.featuresText, { color: textColor, opacity: 0.8 }]}>
                  • Machine learning model improvements{'\n'}
                  • Advanced atmospheric pattern recognition{'\n'}
                  • Historical data correlation analysis{'\n'}
                  • Multi-location comparative analysis{'\n'}
                  • Enhanced mountain wave detection
                </ThemedText>
              </ThemedView>
            </ThemedView>
          )}
        </ThemedView>

        {/* Timeline */}
        <ThemedView style={[styles.timelineCard, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.sectionTitle}>📅 Development Timeline</ThemedText>
          <ThemedView style={styles.timelineList}>
            <ThemedView style={styles.timelineItem}>
              <ThemedText style={[styles.timelineStatus, { color: '#4CAF50' }]}>✅</ThemedText>
              <ThemedText style={[styles.timelineText, { color: textColor }]}>Local prediction logic removed</ThemedText>
            </ThemedView>
            <ThemedView style={styles.timelineItem}>
              <ThemedText style={[styles.timelineStatus, { color: '#FF9800' }]}>🔄</ThemedText>
              <ThemedText style={[styles.timelineText, { color: textColor }]}>Server infrastructure development</ThemedText>
            </ThemedView>
            <ThemedView style={styles.timelineItem}>
              <ThemedText style={[styles.timelineStatus, { color: '#9E9E9E' }]}>⏳</ThemedText>
              <ThemedText style={[styles.timelineText, { color: textColor, opacity: 0.7 }]}>API integration & testing</ThemedText>
            </ThemedView>
            <ThemedView style={styles.timelineItem}>
              <ThemedText style={[styles.timelineStatus, { color: '#9E9E9E' }]}>⏳</ThemedText>
              <ThemedText style={[styles.timelineText, { color: textColor, opacity: 0.7 }]}>Enhanced UI implementation</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {/* Coming Soon Footer */}
        <ThemedView style={[styles.footerCard, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
          <ThemedText style={[styles.footerTitle, { color: '#2196F3' }]}>
            🚀 Coming Soon: Server-Powered Wind Predictions
          </ThemedText>
          <ThemedText style={[styles.footerText, { color: textColor, opacity: 0.8 }]}>
            Stay tuned for enhanced katabatic wind analysis powered by our server infrastructure.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding for tab bar
  },
  // Disabled state styles
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  disabledText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 8,
  },
  disabledSteps: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
    opacity: 0.9,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  warningNote: {
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    width: '100%',
  },
  warningText: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  // Migration card styles
  migrationCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  migrationTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  migrationText: {
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 22,
  },
  migrationSubtext: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Placeholder card styles
  placeholderCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  featureList: {
    marginLeft: 8,
  },
  featureItem: {
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  // Info card styles (collapsible)
  infoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  collapsibleHeader: {
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  collapsibleHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  infoContent: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  highlightText: {
    fontWeight: '600',
  },
  // Benefits list styles
  benefitsList: {
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  benefitEmoji: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  benefitContent: {
    flex: 1,
  },
  benefitName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Server features styles
  serverFeatures: {
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  featuresText: {
    fontSize: 12,
    lineHeight: 18,
  },
  // Timeline styles
  timelineCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timelineList: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  timelineStatus: {
    fontSize: 16,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  timelineText: {
    fontSize: 14,
    flex: 1,
  },
  // Footer styles
  footerCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});

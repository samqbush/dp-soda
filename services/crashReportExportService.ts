import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform, Share } from 'react-native';
import { productionCrashDetector } from './productionCrashDetector';

interface CrashReport {
  reportId: string;
  timestamp: string;
  appInfo: {
    version: string;
    buildType: string;
    platform: string;
    platformVersion: string;
  };
  deviceInfo: {
    model: string;
    screenDimensions: {
      width: number;
      height: number;
      scale: number;
    };
    memoryInfo?: any;
  };
  crashes: any[];
  userActions: any[];
  systemLogs: string[];
  diagnostics: any[];
  performanceMetrics: any[];
  errorBoundaryLogs: any[];
}

interface ExportOptions {
  includeUserActions: boolean;
  includeSystemLogs: boolean;
  includeDiagnostics: boolean;
  includePerformanceMetrics: boolean;
  format: 'json' | 'text' | 'csv';
}

/**
 * Crash Report Export Service
 * Comprehensive crash report generation and export functionality
 */
class CrashReportExportService {
  private readonly STORAGE_KEYS = {
    CRASH_REPORTS: 'crash_reports',
    SYSTEM_LOGS: 'system_logs',
    ERROR_BOUNDARY_LOGS: 'error_boundary_logs',
    PERFORMANCE_METRICS: 'performance_metrics',
    EXPORT_SETTINGS: 'export_settings'
  };

  /**
   * Generate a comprehensive crash report
   */
  async generateCrashReport(): Promise<CrashReport> {
    try {
      const reportId = `crash_report_${Date.now()}`;
      const timestamp = new Date().toISOString();

      // Gather all crash and diagnostic data
      const [
        crashData,
        systemLogs,
        errorBoundaryLogs,
        performanceMetrics,
        diagnostics
      ] = await Promise.all([
        productionCrashDetector.getCrashData(),
        this.getSystemLogs(),
        this.getErrorBoundaryLogs(),
        this.getPerformanceMetrics(),
        this.getDiagnostics()
      ]);

      // Collect device and app information
      const { width, height, scale } = await this.getScreenDimensions();

      const report: CrashReport = {
        reportId,
        timestamp,
        appInfo: {
          version: '1.0.0', // Could be loaded from app.json
          buildType: __DEV__ ? 'development' : 'production',
          platform: Platform.OS,
          platformVersion: String(Platform.Version)
        },
        deviceInfo: {
          model: `${Platform.OS} ${Platform.Version}`,
          screenDimensions: { width, height, scale },
          memoryInfo: this.getMemoryInfo()
        },
        crashes: crashData.crashes,
        userActions: crashData.actions,
        systemLogs,
        diagnostics,
        performanceMetrics,
        errorBoundaryLogs
      };

      // Store the report
      await this.storeCrashReport(report);

      return report;
    } catch (error) {
      console.error('Failed to generate crash report:', error);
      throw error;
    }
  }

  /**
   * Export crash report in specified format
   */
  async exportCrashReport(
    report: CrashReport, 
    options: ExportOptions = {
      includeUserActions: true,
      includeSystemLogs: true,
      includeDiagnostics: true,
      includePerformanceMetrics: true,
      format: 'json'
    }
  ): Promise<void> {
    try {
      let exportData: string;
      let filename: string;
      let mimeType: string;

      switch (options.format) {
        case 'json':
          exportData = this.formatAsJSON(report, options);
          filename = `crash_report_${report.reportId}.json`;
          mimeType = 'application/json';
          break;
        case 'text':
          exportData = this.formatAsText(report, options);
          filename = `crash_report_${report.reportId}.txt`;
          mimeType = 'text/plain';
          break;
        case 'csv':
          exportData = this.formatAsCSV(report, options);
          filename = `crash_report_${report.reportId}.csv`;
          mimeType = 'text/csv';
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      // Store the formatted report
      await AsyncStorage.setItem(`exported_report_${report.reportId}`, exportData);

      // Log the export data for console access
      console.log(`📋 CRASH REPORT EXPORT (${options.format.toUpperCase()}):`);
      console.log('================================');
      console.log(exportData);
      console.log('================================');

      // Try to share the report
      await this.shareReport(exportData, filename, mimeType);

    } catch (error) {
      console.error('Failed to export crash report:', error);
      throw error;
    }
  }

  /**
   * Share crash report via device sharing options
   */
  private async shareReport(data: string, filename: string, mimeType: string): Promise<void> {
    try {
      const shareOptions = {
        message: `Wind Trend Analyzer Crash Report\n\nGenerated: ${new Date().toLocaleString()}\n\n${data}`,
        title: 'Crash Report',
      };

      const result = await Share.share(shareOptions);
      
      if (result.action === Share.sharedAction) {
        Alert.alert('Success', 'Crash report shared successfully');
      } else {
        Alert.alert('Info', 'Report was copied to console logs');
      }
    } catch (error) {
      console.warn('Share failed, report available in console:', error);
      Alert.alert(
        'Report Generated', 
        'Unable to share directly, but the complete report has been logged to the console and can be copied from there.'
      );
    }
  }

  /**
   * Format report as JSON
   */
  private formatAsJSON(report: CrashReport, options: ExportOptions): string {
    const filteredReport: Partial<CrashReport> = { ...report };

    if (!options.includeUserActions) filteredReport.userActions = undefined;
    if (!options.includeSystemLogs) filteredReport.systemLogs = undefined;
    if (!options.includeDiagnostics) filteredReport.diagnostics = undefined;
    if (!options.includePerformanceMetrics) filteredReport.performanceMetrics = undefined;

    return JSON.stringify(filteredReport, null, 2);
  }

  /**
   * Format report as human-readable text
   */
  private formatAsText(report: CrashReport, options: ExportOptions): string {
    let text = `WIND TREND ANALYZER - CRASH REPORT\n`;
    text += `===========================================\n\n`;
    text += `Report ID: ${report.reportId}\n`;
    text += `Generated: ${report.timestamp}\n\n`;

    text += `APP INFORMATION:\n`;
    text += `- Version: ${report.appInfo.version}\n`;
    text += `- Build Type: ${report.appInfo.buildType}\n`;
    text += `- Platform: ${report.appInfo.platform} ${report.appInfo.platformVersion}\n\n`;

    text += `DEVICE INFORMATION:\n`;
    text += `- Model: ${report.deviceInfo.model}\n`;
    text += `- Screen: ${report.deviceInfo.screenDimensions.width}x${report.deviceInfo.screenDimensions.height}@${report.deviceInfo.screenDimensions.scale}x\n\n`;

    text += `CRASH SUMMARY:\n`;
    text += `- Total Crashes: ${report.crashes.length}\n`;
    text += `- Error Boundary Logs: ${report.errorBoundaryLogs.length}\n\n`;

    if (report.crashes.length > 0) {
      text += `RECENT CRASHES:\n`;
      report.crashes.slice(-5).forEach((crash, index) => {
        text += `${index + 1}. ${crash.timestamp}: ${crash.error}\n`;
        if (crash.stack) {
          text += `   Stack: ${crash.stack.substring(0, 200)}...\n`;
        }
      });
      text += `\n`;
    }

    if (options.includeUserActions && report.userActions.length > 0) {
      text += `RECENT USER ACTIONS:\n`;
      report.userActions.slice(-10).forEach((action, index) => {
        text += `${index + 1}. ${action}\n`;
      });
      text += `\n`;
    }

    if (options.includeDiagnostics && report.diagnostics.length > 0) {
      text += `DIAGNOSTICS:\n`;
      report.diagnostics.forEach((diagnostic, index) => {
        text += `${index + 1}. ${diagnostic.test}: ${diagnostic.result} - ${diagnostic.message}\n`;
      });
      text += `\n`;
    }

    if (options.includeSystemLogs && report.systemLogs.length > 0) {
      text += `SYSTEM LOGS (Last 10):\n`;
      report.systemLogs.slice(-10).forEach((log, index) => {
        text += `${index + 1}. ${log}\n`;
      });
    }

    return text;
  }

  /**
   * Format report as CSV
   */
  private formatAsCSV(report: CrashReport, options: ExportOptions): string {
    let csv = `Type,Timestamp,Details,Category\n`;

    // Add crashes
    report.crashes.forEach(crash => {
      csv += `Crash,"${crash.timestamp}","${crash.error.replace(/"/g, '""')}",Error\n`;
    });

    // Add user actions if requested
    if (options.includeUserActions) {
      report.userActions.forEach(action => {
        csv += `UserAction,"${new Date().toISOString()}","${action.replace(/"/g, '""')}",Action\n`;
      });
    }

    // Add diagnostics if requested
    if (options.includeDiagnostics) {
      report.diagnostics.forEach(diagnostic => {
        csv += `Diagnostic,"${new Date().toISOString()}","${diagnostic.test}: ${diagnostic.result} - ${diagnostic.message.replace(/"/g, '""')}",Diagnostic\n`;
      });
    }

    return csv;
  }

  /**
   * Get system logs
   */
  private async getSystemLogs(): Promise<string[]> {
    try {
      const logs = await AsyncStorage.getItem(this.STORAGE_KEYS.SYSTEM_LOGS);
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get error boundary logs
   */
  private async getErrorBoundaryLogs(): Promise<any[]> {
    try {
      const logs = await AsyncStorage.getItem(this.STORAGE_KEYS.ERROR_BOUNDARY_LOGS);
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(): Promise<any[]> {
    try {
      const metrics = await AsyncStorage.getItem(this.STORAGE_KEYS.PERFORMANCE_METRICS);
      return metrics ? JSON.parse(metrics) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get diagnostics data
   */
  private async getDiagnostics(): Promise<any[]> {
    try {
      const diagnostics = await AsyncStorage.getItem('apk_diagnostics');
      return diagnostics ? JSON.parse(diagnostics) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get screen dimensions
   */
  private async getScreenDimensions(): Promise<{width: number, height: number, scale: number}> {
    // This would typically use Dimensions.get('screen')
    return {
      width: 400, // Fallback values
      height: 800,
      scale: 2
    };
  }

  /**
   * Get memory information
   */
  private getMemoryInfo(): any {
    // Basic memory estimation
    try {
      return {
        estimated: true,
        heapUsed: (global as any).performance?.memory?.usedJSHeapSize || 'unknown',
        heapTotal: (global as any).performance?.memory?.totalJSHeapSize || 'unknown'
      };
    } catch {
      return { available: false };
    }
  }

  /**
   * Store crash report
   */
  private async storeCrashReport(report: CrashReport): Promise<void> {
    try {
      const existingReports = await this.getStoredReports();
      const updatedReports = [...existingReports, report].slice(-10); // Keep last 10 reports
      
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.CRASH_REPORTS, 
        JSON.stringify(updatedReports)
      );
    } catch (error) {
      console.error('Failed to store crash report:', error);
    }
  }

  /**
   * Get all stored crash reports
   */
  async getStoredReports(): Promise<CrashReport[]> {
    try {
      const reports = await AsyncStorage.getItem(this.STORAGE_KEYS.CRASH_REPORTS);
      return reports ? JSON.parse(reports) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear all stored crash reports
   */
  async clearAllReports(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.CRASH_REPORTS,
        this.STORAGE_KEYS.SYSTEM_LOGS,
        this.STORAGE_KEYS.ERROR_BOUNDARY_LOGS,
        this.STORAGE_KEYS.PERFORMANCE_METRICS
      ]);
    } catch (error) {
      console.error('Failed to clear crash reports:', error);
      throw error;
    }
  }

  /**
   * Log system event
   */
  async logSystemEvent(event: string): Promise<void> {
    try {
      const logs = await this.getSystemLogs();
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp}: ${event}`;
      
      const updatedLogs = [...logs, logEntry].slice(-100); // Keep last 100 logs
      
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.SYSTEM_LOGS, 
        JSON.stringify(updatedLogs)
      );
    } catch (error) {
      console.error('Failed to log system event:', error);
    }
  }

  /**
   * Quick export for immediate crashes
   */
  async emergencyExport(): Promise<void> {
    try {
      console.log('🚨 EMERGENCY CRASH EXPORT TRIGGERED');
      
      const report = await this.generateCrashReport();
      const quickData = this.formatAsText(report, {
        includeUserActions: true,
        includeSystemLogs: true,
        includeDiagnostics: true,
        includePerformanceMetrics: false,
        format: 'text'
      });

      console.log('📋 EMERGENCY CRASH REPORT:');
      console.log('============================');
      console.log(quickData);
      console.log('============================');

      // Store for later retrieval
      await AsyncStorage.setItem('emergency_crash_report', quickData);
      
    } catch (error) {
      console.error('Emergency export failed:', error);
    }
  }
}

export const crashReportExportService = new CrashReportExportService();

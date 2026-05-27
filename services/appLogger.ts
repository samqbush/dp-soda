/**
 * App Logger Service
 * 
 * Centralized logging for the application with different log levels and formatting.
 * Provides consistent logging across all services.
 */
export class AppLogger {
  private static prefix = '[DP]';

  static info(message: string, ...args: any[]): void {
    if (__DEV__) console.log(`${this.prefix} ℹ️  ${message}`, ...args);
  }

  static success(message: string, ...args: any[]): void {
    if (__DEV__) console.log(`${this.prefix} ✅ ${message}`, ...args);
  }

  static warning(message: string, ...args: any[]): void {
    console.warn(`${this.prefix} ⚠️  ${message}`, ...args);
  }

  static error(message: string, ...args: any[]): void {
    console.error(`${this.prefix} ❌ ${message}`, ...args);
  }

  static debug(message: string, ...args: any[]): void {
    if (__DEV__) {
      console.log(`${this.prefix} 🐛 ${message}`, ...args);
    }
  }
}

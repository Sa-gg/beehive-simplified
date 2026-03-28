import { SettingsDTO, PublicSettingsDTO } from '../types/settings.types.js';

// Simple in-memory storage for settings
// In production, you might want to store this in database
class SettingsRepository {
  private settings: SettingsDTO = {
    openTime: '08:00',
    closeTime: '22:00',
    lastResetDate: null,
    managerPin: '1234', // Default manager PIN
    autoOutOfStockWhenIngredientsRunOut: false, // Default OFF
    autoMarkInStockWhenAvailable: false, // Default OFF
    
    // Payment settings
    cashChangeEnabled: true, // Default ON
    
    // Printing settings
    printKitchenCopy: false, // Default OFF
    printKitchenCopyForOpenTab: false, // Default OFF
    
    // Experimental features
    linkedOrdersEnabled: false, // Default OFF
    
    // Order permissions
    allowVoidOrderItem: true, // Default ON
    
    // Cashier permissions (all require PIN by default)
    cashierCanVoidWithoutPin: false,
    cashierCanRefundWithoutPin: false,
    cashierCanComplimentaryWithoutPin: false,
    cashierCanWriteOffWithoutPin: false,
    cashierCanVoidAndReorderWithoutPin: false,
    
    // Cashier POS permissions (all require PIN by default)
    cashierCanApplyServiceAmount: false,
    cashierCanApplyDiscount: false,
    cashierCanApplyDeliveryAmount: false,
  };
  
  // Flag to force reset on next order
  private forceResetFlag: boolean = false;

  getAllSettings(): PublicSettingsDTO {
    // Return settings without exposing the actual PIN
    const { managerPin, ...publicSettings } = this.settings;
    return { ...publicSettings };
  }

  updateSettings(settings: Partial<SettingsDTO>): void {
    this.settings = { ...this.settings, ...settings };
  }

  getLastResetDate(): string | null {
    return this.settings.lastResetDate;
  }

  setLastResetDate(date: string): void {
    this.settings.lastResetDate = date;
  }

  getOpenTime(): string {
    return this.settings.openTime;
  }

  getCloseTime(): string {
    return this.settings.closeTime;
  }

  getForceResetFlag(): boolean {
    return this.forceResetFlag;
  }

  setForceResetFlag(value: boolean): void {
    this.forceResetFlag = value;
  }
  
  getManagerPin(): string {
    return this.settings.managerPin || '1234';
  }
  
  setManagerPin(pin: string): void {
    this.settings.managerPin = pin;
  }
  
  validateManagerPin(pin: string): boolean {
    return this.settings.managerPin === pin;
  }
  
  // Auto-stock settings getters and setters
  getAutoOutOfStockWhenIngredientsRunOut(): boolean {
    return this.settings.autoOutOfStockWhenIngredientsRunOut ?? false;
  }
  
  setAutoOutOfStockWhenIngredientsRunOut(value: boolean): void {
    this.settings.autoOutOfStockWhenIngredientsRunOut = value;
  }
  
  getAutoMarkInStockWhenAvailable(): boolean {
    return this.settings.autoMarkInStockWhenAvailable ?? false;
  }
  
  setAutoMarkInStockWhenAvailable(value: boolean): void {
    this.settings.autoMarkInStockWhenAvailable = value;
  }
  
  // Global settings getters (for all accounts)
  getGlobalSettings(): PublicSettingsDTO {
    const { managerPin, ...publicSettings } = this.settings;
    return publicSettings;
  }
  
  // Bulk update global settings
  updateGlobalSettings(settings: Partial<Omit<SettingsDTO, 'managerPin'>>): void {
    // Don't allow managerPin to be updated through this method
    const { ...safeSettings } = settings as Partial<SettingsDTO>;
    this.settings = { ...this.settings, ...safeSettings };
  }
}

// Export a singleton instance to ensure settings are shared across the application
export const settingsRepository = new SettingsRepository();

export { SettingsRepository };

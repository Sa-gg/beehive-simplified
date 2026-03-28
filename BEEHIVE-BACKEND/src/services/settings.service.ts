import { SettingsRepository } from '../repositories/settings.repository.js';
import { SettingsDTO, PublicSettingsDTO } from '../types/settings.types.js';

class SettingsService {
  constructor(private settingsRepository: SettingsRepository) {}

  getSettings(): PublicSettingsDTO {
    return this.settingsRepository.getAllSettings();
  }

  updateSettings(settings: Partial<SettingsDTO>): PublicSettingsDTO {
    this.settingsRepository.updateSettings(settings);
    return this.settingsRepository.getAllSettings();
  }

  forceResetOrderNumbers(): void {
    // Set the force reset flag - next order will reset to 1
    this.settingsRepository.setForceResetFlag(true);
  }
  
  validateManagerPin(pin: string): boolean {
    return this.settingsRepository.validateManagerPin(pin);
  }
  
  updateManagerPin(pin: string): void {
    this.settingsRepository.setManagerPin(pin);
  }
  
  // Auto-stock settings methods
  getAutoOutOfStockWhenIngredientsRunOut(): boolean {
    return this.settingsRepository.getAutoOutOfStockWhenIngredientsRunOut();
  }
  
  setAutoOutOfStockWhenIngredientsRunOut(value: boolean): void {
    this.settingsRepository.setAutoOutOfStockWhenIngredientsRunOut(value);
  }
  
  getAutoMarkInStockWhenAvailable(): boolean {
    return this.settingsRepository.getAutoMarkInStockWhenAvailable();
  }
  
  setAutoMarkInStockWhenAvailable(value: boolean): void {
    this.settingsRepository.setAutoMarkInStockWhenAvailable(value);
  }
  
  // Global settings (shared across all accounts)
  getGlobalSettings(): PublicSettingsDTO {
    return this.settingsRepository.getGlobalSettings();
  }
  
  updateGlobalSettings(settings: Partial<Omit<SettingsDTO, 'managerPin'>>): PublicSettingsDTO {
    this.settingsRepository.updateGlobalSettings(settings);
    return this.settingsRepository.getGlobalSettings();
  }
}

export { SettingsService };

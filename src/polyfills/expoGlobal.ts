/**
 * Early runtime initialization for Expo global and EventEmitter.
 * Ensures globalThis.expo and globalThis.expo.EventEmitter are initialized
 * before any modules or navigators are evaluated by Metro.
 */
import { TurboModuleRegistry } from 'react-native';

// 1. Ensure window is defined on globalThis for packages expecting a window object
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}

// 2. Synchronously invoke TurboModule to install native expo bindings if present
try {
  const expoModulesCore = TurboModuleRegistry.get('ExpoModulesCore') as { installModules?: () => void } | null;
  expoModulesCore?.installModules?.();
} catch (_err) {
  // TurboModule unavailable or already registered natively
}

// 3. Fallback core classes matching expo-modules-core specifications
export class ExpoEventEmitter {
  private _listeners?: Map<string | number | symbol, Set<Function>>;

  addListener<EventName extends string | number | symbol>(eventName: EventName, listener: any): any {
    if (!this._listeners) {
      this._listeners = new Map();
    }
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set());
    }
    const previousCount = this.listenerCount(eventName);
    this._listeners.get(eventName)!.add(listener);
    if (previousCount === 0 && this.listenerCount(eventName) === 1) {
      this.startObserving(eventName);
    }
    return {
      remove: () => {
        this.removeListener(eventName, listener);
      },
    };
  }

  removeListener<EventName extends string | number | symbol>(eventName: EventName, listener: any): void {
    const hasRemoved = this._listeners?.get(eventName)?.delete(listener);
    if (this.listenerCount(eventName) === 0 && hasRemoved) {
      this.stopObserving(eventName);
    }
  }

  removeAllListeners<EventName extends string | number | symbol>(eventName?: EventName): void {
    if (eventName) {
      const prev = this.listenerCount(eventName);
      this._listeners?.get(eventName)?.clear();
      if (prev > 0) {
        this.stopObserving(eventName);
      }
    } else {
      this._listeners?.clear();
    }
  }

  emit<EventName extends string | number | symbol>(eventName: EventName, ...args: any[]): void {
    const current = this._listeners?.get(eventName);
    if (current) {
      const snapshot = new Set(current);
      snapshot.forEach((fn) => {
        try {
          fn(...args);
        } catch (error) {
          console.error(error);
        }
      });
    }
  }

  listenerCount<EventName extends string | number | symbol>(eventName: EventName): number {
    return this._listeners?.get(eventName)?.size ?? 0;
  }

  startObserving<EventName extends string | number | symbol>(_eventName: EventName): void {}
  stopObserving<EventName extends string | number | symbol>(_eventName: EventName): void {}
}

export class ExpoNativeModule extends ExpoEventEmitter {
  ViewPrototypes: any;
  __expo_module_name__?: string;
}

export class ExpoSharedObject extends ExpoEventEmitter {
  release(): void {}
}

export class ExpoSharedRef extends ExpoSharedObject {
  nativeRefType = 'unknown';
}

// 4. Guarantee globalThis.expo and globalThis.expo.EventEmitter exist
const expoAny = globalThis as any;
if (!expoAny.expo) {
  expoAny.expo = {
    EventEmitter: ExpoEventEmitter,
    NativeModule: ExpoNativeModule,
    SharedObject: ExpoSharedObject,
    SharedRef: ExpoSharedRef,
    modules: {},
    uuidv4: () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      }),
    uuidv5: () => '',
    getViewConfig: () => {
      throw new Error('getViewConfig is not implemented in fallback mode');
    },
    reloadAppAsync: async () => {},
    expoModulesCoreVersion: '58.0.30',
    cacheDir: undefined,
    documentsDir: undefined,
    isRunningOnQuest: false,
    installOnUIRuntime: () => {},
  };
} else if (!expoAny.expo.EventEmitter) {
  expoAny.expo.EventEmitter = ExpoEventEmitter;
}

if (!expoAny.expo.NativeModule) {
  expoAny.expo.NativeModule = ExpoNativeModule;
}
if (!expoAny.expo.SharedObject) {
  expoAny.expo.SharedObject = ExpoSharedObject;
}
if (!expoAny.expo.SharedRef) {
  expoAny.expo.SharedRef = ExpoSharedRef;
}
if (!expoAny.expo.modules) {
  expoAny.expo.modules = {};
}

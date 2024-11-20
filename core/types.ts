export type ProviderOptions = {
  dangerouslyInjectWindow?: boolean;
  walletStandard?: boolean;
  eip6963?: boolean;
};

export type WalletOptions = {
  appId?: string;
  providers: {
    passkey: boolean | ProviderOptions;
  };
};

export interface Provider {
  isConnected: () => Promise<boolean>;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, listener: (...args: any[]) => void) => void;
  removeListener: (event: string, listener: (...args: any[]) => void) => void;
  chains?: string[]; // Add this line
  features?: Record<string, any>; // Add this line
}

export type Wallet = {
  providers: {
    passkey: Provider;
  };
  renderWidget: (container: HTMLElement | null) => Promise<void>;
  setWidgetConfig: (config: any) => void;
  experimental_expand: (options?: { path?: string }) => Promise<void>;
  experimental_destroyWidget: () => void;
};

export type ReadyState = 'pending' | 'ready' | 'refused';

export interface DeferredPromise<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}




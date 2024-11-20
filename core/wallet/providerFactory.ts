import { Provider, ProviderOptions } from '../types';

type SendRequestFunction = (method: string, params?: any[]) => Promise<any>;

export const createProviderFactory = (sendRequest: SendRequestFunction) => {
  const createProvider = (network: string, options: boolean | ProviderOptions): Provider => {
    const providerOptions = typeof options === 'boolean' ? {} : options;

    const isConnected = async (): Promise<boolean> => {
      return sendRequest('isConnected');
    };

    const request = async (args: { method: string; params?: any[] }): Promise<any> => {
      return sendRequest(args.method, args.params);
    };

    const eventListeners = new Map<string, Set<(...args: any[]) => void>>();

    const on = (event: string, listener: (...args: any[]) => void): void => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
      }
      eventListeners.get(event)!.add(listener);
    };

    const removeListener = (event: string, listener: (...args: any[]) => void): void => {
      const listeners = eventListeners.get(event);
      if (listeners) {
        listeners.delete(listener);
      }
    };

    let provider: Provider = {
      isConnected,
      request,
      on,
      removeListener,
    };

    if (providerOptions.dangerouslyInjectWindow) {
      const injectedProvider = { ...provider };
      Object.defineProperty(window, network, {
        value: injectedProvider,
        writable: false,
        configurable: true,
      });
    }

    if (providerOptions.walletStandard && network !== 'ethereum') {
      provider = createWalletStandardProvider(provider, network, sendRequest);
    }

    if (providerOptions.eip6963 && network === 'ethereum') {
      provider = createEIP6963Provider(provider);
    }

    return provider;
  };

  return { createProvider };
};

const createWalletStandardProvider = (baseProvider: Provider, network: string, sendRequest: SendRequestFunction): Provider => {
  return {
    ...baseProvider,
    // Remove the 'accounts' property as it's not part of the Provider type
    chains: [network],
    features: {
      'standard:connect': {
        version: '1.0.0',
        connect: async () => {
          const accounts = await sendRequest('connect');
          return { accounts };
        },
      },
      'standard:disconnect': {
        version: '1.0.0',
        disconnect: async () => {
          await sendRequest('disconnect');
        },
      },
    },
  };
};

const createEIP6963Provider = (baseProvider: Provider): Provider => {
  const eip6963Provider: Provider & { info?: any } = {
    ...baseProvider,
    info: {
      uuid: crypto.randomUUID(),
      name: 'Passkeys Wallet',
      icon: 'data:image/svg+xml;base64,...', // Add your icon here
      rdns: 'com.passkeys.wallet',
    },
  };

  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: Object.freeze({
      info: eip6963Provider.info,
      provider: eip6963Provider,
    }),
  }));

  return eip6963Provider;
};

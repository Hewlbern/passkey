import { WalletOptions, Wallet, Provider, DeferredPromise, ProviderOptions } from '../types';
import { createIframeManager, IframeManager } from './iframeManager';
import { createProviderFactory } from './providerFactory';
import { createEventManager } from './eventManager';
import { ConfigManager } from './configManager';
import { createPasskeyProvider } from './passkeyProvider';

let globalWallet: Wallet | null = null;

function createDeferred<T>(): DeferredPromise<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

class ResponseCache {
  private cache = new Map<string, any>();

  saveResponse(method: string, response: any) {
    this.cache.set(method, response);
  }

  fetchResponse(method: string) {
    return this.cache.get(method);
  }

  clear() {
    this.cache.clear();
  }
}

export function createWallet(options: WalletOptions): Wallet {
  if (globalWallet) {
    console.warn("@passkeys/core: 'createWallet' was called more than once. This is not supported.");
    return globalWallet;
  }

  const iframeManager = createIframeManager();
  const eventManager = createEventManager(iframeManager);
  const configManager = new ConfigManager();
  const responseCache = new ResponseCache();
  const pendingRequests = new Map<string, { input: string; payload: any; deferred: DeferredPromise<any> }>();

  const sendRequest = async (method: string, params?: any[]): Promise<any> => {
    const cachedResponse = responseCache.fetchResponse(method);
    if (cachedResponse) {
      return cachedResponse;
    }

    const requestId = Math.random().toString(36).substring(2, 15);
    const deferred = createDeferred<any>();
    const input = JSON.stringify({ id: requestId, method, params });
    
    pendingRequests.set(requestId, { input, payload: { method, params }, deferred });
    
    iframeManager.sendMessage('provider:request', { method, params, id: requestId });
    
    return deferred.promise;
  };

  const providerFactory = createProviderFactory(sendRequest);

  const handleProviderResponse = (data: any) => {
    const request = pendingRequests.get(data.id);
    if (request) {
      const { method } = request.payload;
      responseCache.saveResponse(method, data.result);
      request.deferred.resolve(data.result);
      pendingRequests.delete(data.id);
    }
  };

  eventManager.addMessageListener((event) => {
    if (event.data.type === 'provider:response') {
      handleProviderResponse(event.data);
    }
  });

  const providers: Wallet['providers'] = {
    passkey: createPasskeyProvider(sendRequest)
  };

  const wallet: Wallet = {
    providers,
    renderWidget: iframeManager.renderWidget,
    setWidgetConfig: (config) => {
      if (configManager.hasConfigChanged(config)) {
        configManager.setConfig(config);
        if (iframeManager.readyState === 'ready') {
          iframeManager.setWidgetConfig(config);
        }
      }
    },
    experimental_expand: async (options = {}) => {
      await iframeManager.awaitReady();
      iframeManager.expand(options.path);
    },
    experimental_destroyWidget: () => {
      iframeManager.destroy();
      eventManager.cleanup();
      pendingRequests.clear();
      responseCache.clear();
      globalWallet = null;
    },
  };

  eventManager.initializeEventListeners();

  globalWallet = wallet;
  return wallet;
}

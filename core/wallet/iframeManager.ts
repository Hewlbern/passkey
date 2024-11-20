import { DeferredPromise } from '../types';

const IFRAME_URL = 'https://embedded.passkeys.foundation';
const WALLET_READY = 'wallet:ready';
const WALLET_LOCKED = 'wallet:locked';
const PROVIDER_REQUEST = 'provider:request';
const PROVIDER_RESPONSE = 'provider:response';
const WIDGET_CONFIG = 'wallet:widget:config';
const WALLET_EXPAND = 'wallet:expand';
const WALLET_RESIZE = 'wallet:resize';
const WALLET_DETACH = 'wallet:detach';

export type ReadyState = 'pending' | 'ready' | 'refused';

export interface IframeManager {
  iframe: HTMLIFrameElement;
  readyState: ReadyState;
  setReady: (state?: ReadyState) => void;
  resetReady: () => void;
  awaitReady: () => Promise<void>;
  sendMessage: (type: string, data?: any) => void;
  addMessageListener: (handler: (event: MessageEvent) => void) => void;
  removeMessageListener: (handler: (event: MessageEvent) => void) => void;
  setWidgetConfig: (config: any) => void;
  renderWidget: (container: HTMLElement | null) => Promise<void>;
  expand: (path?: string) => void;
  destroy: () => void;
}

export function createIframeManager(): IframeManager {
  const iframe = document.createElement('iframe');
  iframe.src = IFRAME_URL;
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  let readyState: ReadyState = 'pending';
  const messageListeners: Set<(event: MessageEvent) => void> = new Set();

  const setReady = (state: ReadyState = 'ready') => {
    readyState = state;
  };

  const resetReady = () => {
    readyState = 'pending';
  };

  const awaitReady = async () => {
    if (readyState === 'ready') return;
    await new Promise<void>((resolve) => {
      const checkReady = () => {
        if (readyState === 'ready') {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  };

  const sendMessage = (type: string, data?: any) => {
    iframe.contentWindow?.postMessage({ type, ...data }, IFRAME_URL);
  };

  const addMessageListener = (handler: (event: MessageEvent) => void) => {
    messageListeners.add(handler);
    window.addEventListener('message', handler);
  };

  const removeMessageListener = (handler: (event: MessageEvent) => void) => {
    messageListeners.delete(handler);
    window.removeEventListener('message', handler);
  };

  const setWidgetConfig = (config: any) => {
    sendMessage(WIDGET_CONFIG, { config });
  };

  const renderWidget = async (container: HTMLElement | null) => {
    await awaitReady();
    resetReady();
    
    if (container) {
      iframe.style.display = 'block';
      container.appendChild(iframe);
      await awaitReady();
    } else {
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }
  };

  const expand = (path?: string) => {
    if (path) {
      sendMessage(WALLET_EXPAND, { path });
    }
    window.postMessage({ type: WALLET_RESIZE, expanded: true }, '*');
  };

  const destroy = () => {
    messageListeners.forEach(handler => {
      window.removeEventListener('message', handler);
    });
    messageListeners.clear();
    iframe.remove();
  };

  return {
    iframe,
    readyState,
    setReady,
    resetReady,
    awaitReady,
    sendMessage,
    addMessageListener,
    removeMessageListener,
    setWidgetConfig,
    renderWidget,
    expand,
    destroy,
  };
}

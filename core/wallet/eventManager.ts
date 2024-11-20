import { IframeManager } from './iframeManager';

type MessageHandler = (event: MessageEvent) => void;

export const createEventManager = (iframeManager: IframeManager) => {
  const messageListeners: Set<MessageHandler> = new Set();

  const addMessageListener = (handler: MessageHandler) => {
    messageListeners.add(handler);
    window.addEventListener('message', handler);
  };

  const removeMessageListener = (handler: MessageHandler) => {
    messageListeners.delete(handler);
    window.removeEventListener('message', handler);
  };

  const handleWalletReady = () => {
    iframeManager.setReady();
  };

  const handleWalletLocked = () => {
    // Implement wallet locked logic
  };

  const handleProviderResponse = (data: any) => {
    // Implement provider response logic
  };

  const initializeEventListeners = () => {
    addMessageListener((event) => {
      if (event.origin !== iframeManager.iframe.src) return;

      const { type, data } = event.data;

      switch (type) {
        case 'wallet:ready':
          handleWalletReady();
          break;
        case 'wallet:locked':
          handleWalletLocked();
          break;
        case 'provider:response':
          handleProviderResponse(data);
          break;
        // Add other cases as needed
      }
    });

    window.addEventListener('securitypolicyviolation', (event) => {
      if (event.blockedURI === iframeManager.iframe.src) {
        iframeManager.setReady('refused');
      }
    });
  };

  const cleanup = () => {
    messageListeners.forEach(removeMessageListener);
    messageListeners.clear();
  };

  return {
    addMessageListener,
    removeMessageListener,
    initializeEventListeners,
    cleanup,
  };
};

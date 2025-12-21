import { useState, useCallback, ReactNode } from 'react';

interface UseModalOptions {
  initialOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Custom hook for modal/dialog state management
 * 
 * @example
 * const modal = useModal();
 * 
 * <button onClick={modal.open}>Open Modal</button>
 * {modal.isOpen && <Modal onClose={modal.close}>Content</Modal>}
 */
export function useModal(options: UseModalOptions = {}): UseModalReturn {
  const { initialOpen = false, onOpen, onClose } = options;

  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return { isOpen, open, close, toggle };
}

/**
 * Hook for managing multiple modals
 * Useful for pages with several modal dialogs
 * 
 * @example
 * const modals = useModals(['addLead', 'editLead', 'deleteLead']);
 * 
 * modals.open('addLead')
 * {modals.isOpen('addLead') && <AddLeadModal />}
 */
export function useModals(names: string[]) {
  const [openModals, setOpenModals] = useState<Set<string>>(new Set());

  const isOpen = useCallback(
    (name: string) => openModals.has(name),
    [openModals]
  );

  const open = useCallback((name: string) => {
    setOpenModals((prev) => new Set(prev).add(name));
  }, []);

  const close = useCallback((name: string) => {
    setOpenModals((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, []);

  const toggle = useCallback((name: string) => {
    setOpenModals((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const closeAll = useCallback(() => {
    setOpenModals(new Set());
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    closeAll,
  };
}

/**
 * Hook for confirmation dialogs
 * Handles confirm/cancel with callbacks
 * 
 * @example
 * const confirm = useConfirm();
 * 
 * confirm.show({
 *   title: 'Delete?',
 *   onConfirm: () => deleteItem(),
 * });
 * 
 * {confirm.isOpen && <ConfirmDialog {...confirm} />}
 */
interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
  isDangerous?: boolean;
}

interface UseConfirmReturn {
  isOpen: boolean;
  options: ConfirmOptions | null;
  show: (options: ConfirmOptions) => void;
  confirm: () => Promise<void>;
  cancel: () => void;
  isConfirming: boolean;
}

export function useConfirm(): UseConfirmReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const show = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const confirm = useCallback(async () => {
    if (!options) return;
    setIsConfirming(true);
    try {
      await options.onConfirm();
    } finally {
      setIsConfirming(false);
      setIsOpen(false);
      setOptions(null);
    }
  }, [options]);

  const cancel = useCallback(() => {
    options?.onCancel?.();
    setIsOpen(false);
    setOptions(null);
  }, [options]);

  return {
    isOpen,
    options,
    show,
    confirm,
    cancel,
    isConfirming,
  };
}

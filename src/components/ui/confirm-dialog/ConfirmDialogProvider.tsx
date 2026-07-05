'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Button } from '@/components/ui/button/Button';
import styles from './ConfirmDialog.module.css';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType>({
  confirm: async () => false,
});

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>(() => {});

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handleChoice = (value: boolean) => {
    setOptions(null);
    resolver.current(value);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <div className={styles.overlay} onClick={() => handleChoice(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
            <h2 id="confirm-dialog-title" className={styles.title}>{options.title}</h2>
            <p className={styles.message}>{options.message}</p>
            <div className={styles.actions}>
              <Button type="button" variant="outline" onClick={() => handleChoice(false)}>
                {options.cancelLabel || 'Cancel'}
              </Button>
              <Button type="button" variant={options.danger ? 'primary' : 'dark'} onClick={() => handleChoice(true)}>
                {options.confirmLabel || 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext).confirm;
}

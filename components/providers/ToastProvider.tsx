// components/providers/ToastProvider.tsx
'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

// --- Types ---

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'default';

interface ToastMessage {
    id: string;
    title?: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    toasts: ToastMessage[];
    addToast: (toast: Omit<ToastMessage, 'id'>) => void;
    removeToast: (id: string) => void;
}

// --- Context ---

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// --- Hook ---

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

// --- Components ---

const ToastItem = ({
                       toast,
                       onRemove
                   }: {
    toast: ToastMessage;
    onRemove: (id: string) => void
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const animationFrame = requestAnimationFrame(() => {
            setIsVisible(true);
        });

        let dismissTimer: NodeJS.Timeout;
        if (toast.duration !== Infinity) {
            dismissTimer = setTimeout(() => {
                handleDismiss();
            }, toast.duration || 5000);
        }

        return () => {
            cancelAnimationFrame(animationFrame);
            if (dismissTimer) clearTimeout(dismissTimer);
        };
    }, [toast]);

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(() => {
            onRemove(toast.id);
        }, 300);
    };

    const getStyles = (type: ToastType) => {
        switch (type) {
            case 'success':
                return {
                    container: 'border border-green-600/50 bg-green-500/10 backdrop-blur-md',
                    content: 'text-green-800 dark:text-green-200',
                    icon: 'text-green-600 dark:text-green-400',
                    button: 'text-green-600 hover:bg-green-500/20 dark:text-green-400',
                };
            case 'error':
                return {
                    container: 'border border-rose-600/50 bg-rose-500/10 backdrop-blur-md',
                    content: 'text-rose-800 dark:text-rose-200',
                    icon: 'text-rose-600 dark:text-rose-400',
                    button: 'text-rose-600 hover:bg-rose-500/20 dark:text-rose-400',
                };
            case 'warning':
                return {
                    container: 'border border-amber-600/50 bg-amber-500/10 backdrop-blur-md',
                    content: 'text-amber-800 dark:text-amber-200',
                    icon: 'text-amber-600 dark:text-amber-400',
                    button: 'text-amber-600 hover:bg-amber-500/20 dark:text-amber-400',
                };
            case 'info':
                return {
                    container: 'border border-blue-600/50 bg-blue-500/10 backdrop-blur-md',
                    content: 'text-blue-800 dark:text-blue-200',
                    icon: 'text-blue-600 dark:text-blue-400',
                    button: 'text-blue-600 hover:bg-blue-500/20 dark:text-blue-400',
                };
            default:
                return {
                    container: 'border border-zinc-500/50 bg-zinc-500/10 backdrop-blur-md',
                    content: 'text-zinc-800 dark:text-zinc-200',
                    icon: 'text-zinc-500 dark:text-zinc-400',
                    button: 'text-zinc-500 hover:bg-zinc-500/20 dark:text-zinc-400',
                };
        }
    };

    const styles = getStyles(toast.type);

    const getIcon = (type: ToastType) => {
        const iconClass = `w-5 h-5 ${styles.icon}`;
        switch (type) {
            case 'success': return <CheckCircle2 className={iconClass} />;
            case 'error': return <AlertCircle className={iconClass} />;
            case 'warning': return <AlertTriangle className={iconClass} />;
            case 'info': return <Info className={iconClass} />;
            default: return <Info className={iconClass} />;
        }
    };

    return (
        <div
            className={`
        pointer-events-auto relative flex w-full max-w-sm overflow-hidden 
        rounded-2xl shadow-md border
        transition-all duration-300 ease-[cubic-bezier(0.21,1.02,0.73,1)]
        ${styles.container}
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-95'}
        mb-3
      `}
            role="alert"
        >
            <div className="p-3 w-full">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        {getIcon(toast.type)}
                    </div>
                    <div className="flex-1 pt-0.5">
                        {toast.title && (
                            <p className={`text-sm font-semibold ${styles.content}`}>{toast.title}</p>
                        )}
                        <p className={`text-sm opacity-90 ${styles.content}`}>{toast.message}</p>
                    </div>
                    <div className="flex flex-shrink-0">
                        <button
                            type="button"
                            className={`inline-flex rounded-full p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent transition-colors ${styles.button}`}
                            onClick={handleDismiss}
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ToastContainer = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex flex-col items-end px-4 py-6 sm:items-end sm:p-6 z-[9999] space-y-4"
        >
            <div className="flex w-full flex-col items-center space-y-3 sm:items-end">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </div>
    );
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback(({ title, message, type = 'default', duration = 5000 }: Omit<ToastMessage, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, title, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer />
        </ToastContext.Provider>
    );
};

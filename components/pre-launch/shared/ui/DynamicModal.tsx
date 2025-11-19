import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// --- Types & Interfaces ---

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type ModalDirection = 'up' | 'down' | 'left' | 'right';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    size?: ModalSize;
    direction?: ModalDirection;
    actionLabel?: string;
    onAction?: () => void;
    isDestructive?: boolean; // Optional: for delete actions
    showFooter?: boolean;
}

// --- Helper Configuration ---

const sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-sm w-full mx-4',
    md: 'max-w-md w-full mx-4',
    lg: 'max-w-lg w-full mx-4',
    xl: 'max-w-xl w-full mx-4',
    full: 'w-full h-full m-0 rounded-none',
};

// Animation Variants Factory
const getVariants = (direction: ModalDirection) => {
    const distance = 50; // pixel travel distance

    const variants = {
        up: {
            hidden: { y: -distance, opacity: 0 },
            visible: { y: 0, opacity: 1 },
            exit: { y: -distance, opacity: 0 },
        },
        down: {
            hidden: { y: distance, opacity: 0 },
            visible: { y: 0, opacity: 1 },
            exit: { y: distance, opacity: 0 },
        },
        left: {
            hidden: { x: -distance, opacity: 0 },
            visible: { x: 0, opacity: 1 },
            exit: { x: -distance, opacity: 0 },
        },
        right: {
            hidden: { x: distance, opacity: 0 },
            visible: { x: 0, opacity: 1 },
            exit: { x: distance, opacity: 0 },
        },
    };

    return variants[direction];
};

// --- Reusable Modal Component ---

const DynamicModal: React.FC<ModalProps> = ({
     isOpen,
     onClose,
     children,
     size = 'md',
     direction = 'down',
     actionLabel = 'Confirm',
     onAction,
     isDestructive = false,
     showFooter = true
}) => {
    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleEsc);

        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const isFull = size === 'full';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        animate={{ opacity: 1 }}
                        aria-hidden="true"
                        className="absolute inset-0 bg-black/10 backdrop-blur-sm transition-opacity"
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        animate="visible"
                        aria-modal="true"
                        className={`
                             relative z-10 flex flex-col bg-black border-1 border-white/10
                             shadow-2xl overflow-hidden
                             ${isFull ? '' : 'rounded-xl max-h-[90vh]'}
                             ${sizeClasses[size]}
                        `}
                        exit="exit"
                        initial="hidden"
                        role="dialog"
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        variants={getVariants(direction)}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-end px-4 py-4 shadow-lg shadow-black/25">
                            <button
                                className="rounded-full bg-[#F2F3F71A] hover:bg-[#F2F3F733] transition-all duration-300 w-7 h-7 flex items-center justify-center"
                                onClick={onClose}
                            >
                                <X className="size-4 text-white" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 text-gray-600 dark:text-gray-300">
                            {children}
                        </div>

                        {/* Footer */}
                        {showFooter &&
                            <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-700 px-6 py-4 bg-gray-50/50 dark:bg-gray-900/20">
                                <button
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    onClick={onClose}
                                >
                                    Cancel
                                </button>
                                {onAction && (
                                    <button
                                        className={`
                                        px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all
                                        focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                                        ${isDestructive
                                            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                            : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                        }
                                    `}
                                        onClick={onAction}
                                    >
                                        {actionLabel}
                                    </button>
                                )}
                            </div>
                        }
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DynamicModal;

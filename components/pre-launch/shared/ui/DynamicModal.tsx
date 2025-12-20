import React, { useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { X } from 'lucide-react';

// --- Types & Interfaces ---

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type ModalDirection = 'up' | 'down' | 'left' | 'right';
type ModalPosition = 'center' | 'fixed';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    size?: ModalSize;
    direction?: ModalDirection;
    position?: ModalPosition; // New Prop
    actionLabel?: string;
    onAction?: () => void;
    isDestructive?: boolean;
    showFooter?: boolean;
}

// --- Helper Configuration ---

const sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-sm w-full',
    md: 'max-w-md w-full',
    lg: 'max-w-lg w-full',
    xl: 'max-w-xl w-full',
    full: 'w-full h-full m-0 rounded-none',
};

// Animation Variants Factory
const getVariants = (direction: ModalDirection, isFixed: boolean): Variants => {
    // If fixed (sidebar), we travel 100% to go off-screen.
    // If centered (modal), we travel 50px for a subtle effect.
    const distance = isFixed ? '100%' : 50;

    // When fixed, we usually want opacity to stay 1 until fully closed off-screen,
    // but standard modals fade out as they move.
    const exitOpacity = isFixed ? 1 : 0;

    const variants = {
        up: {
            hidden: { y: typeof distance === 'string' ? `-${distance}` : -distance, opacity: 0 },
            visible: { y: 0, opacity: 1 },
            exit: { y: typeof distance === 'string' ? `-${distance}` : -distance, opacity: exitOpacity },
        },
        down: {
            hidden: { y: distance, opacity: 0 },
            visible: { y: 0, opacity: 1 },
            exit: { y: distance, opacity: exitOpacity },
        },
        left: {
            hidden: { x: typeof distance === 'string' ? `-${distance}` : -distance, opacity: 0 },
            visible: { x: 0, opacity: 1 },
            exit: { x: typeof distance === 'string' ? `-${distance}` : -distance, opacity: exitOpacity },
        },
        right: {
            hidden: { x: distance, opacity: 0 },
            visible: { x: 0, opacity: 1 },
            exit: { x: distance, opacity: exitOpacity },
        },
    };

    return variants[direction];
};

// Helper to determine flex alignment and border radius based on position/direction
const getPositionClasses = (position: ModalPosition, direction: ModalDirection) => {
    if (position === 'center') {
        return {
            wrapper: 'items-center justify-center',
            modal: 'mx-4 rounded-xl max-h-[90vh]'
        };
    }

    // Fixed Layouts (Sidebars/Drawers)
    switch (direction) {
        case 'right':
            return {
                wrapper: 'items-stretch justify-end', // Full height, pinned right
                modal: 'h-full rounded-l-xl border-r-0'
            };
        case 'left':
            return {
                wrapper: 'items-stretch justify-start', // Full height, pinned left
                modal: 'h-full rounded-r-xl border-l-0'
            };
        case 'down':
            return {
                wrapper: 'items-end justify-center', // Bottom sheet
                modal: 'w-full rounded-t-xl border-b-0 max-h-[90vh]' // Allow height to grow, but cap it
            };
        case 'up':
            return {
                wrapper: 'items-start justify-center', // Top bar
                modal: 'w-full rounded-b-xl border-t-0 max-h-[90vh]'
            };
        default:
            return { wrapper: 'items-center justify-center', modal: 'mx-4 rounded-xl' };
    }
};

// --- Reusable Modal Component ---

const DynamicModal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    children,
    size = 'md',
    direction = 'down',
    position = 'center', // Defaults to standard modal
    actionLabel = 'Confirm',
    onAction,
    isDestructive = false,
    showFooter = true
}) => {

    // Lock body scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // Handle Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleEsc);

        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const isFull = size === 'full';
    const isFixed = position === 'fixed';

    // Calculate layout classes based on position logic
    const posClasses = getPositionClasses(position, direction);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className={`fixed inset-0 z-50 flex overflow-hidden ${posClasses.wrapper}`}>

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
                             relative z-10 flex flex-col pb-4 bg-black border border-white/10
                             shadow-2xl overflow-hidden
                             ${isFull ? 'w-full h-full m-0 rounded-none' : `${sizeClasses[size]} ${posClasses.modal}`}
                        `}
                        exit="exit"
                        initial="hidden"
                        role="dialog"
                        // We adjust stiffness/damping for sidebars to feel more "mechanical" and snappy
                        transition={{ type: 'spring', damping: isFixed ? 30 : 25, stiffness: 300 }}
                        variants={getVariants(direction, isFixed)}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-end px-4 py-4 shadow-lg shadow-black/25 shrink-0">
                            <button
                                className="rounded-full bg-[#F2F3F71A] hover:bg-[#F2F3F733] transition-all duration-300 w-7 h-7 flex items-center justify-center cursor-pointer"
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
                            <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-700 px-6 py-4 bg-gray-50/50 dark:bg-gray-900/20 shrink-0">
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

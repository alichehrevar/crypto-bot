// components/ui/accordion/AccordionItem.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

import {ChevronRightIcon} from "@/utils/icons";

// Define the types for the component's props
type AccordionItemProps = {
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
};

const AccordionItem = ({ title, children, isOpen, onToggle }: AccordionItemProps) => {
    return (
        <div className="border-b border-gray-200 last-of-type:border-b-0">
            <button
                aria-expanded={isOpen}
                className="flex items-center justify-between w-full py-4 text-xs text-left font-semibold cursor-pointer"
                type="button"
                onClick={onToggle}
            >
                <span className="capitalize">
                    {title.replaceAll('-', ' ')}
                </span>
                <motion.div
                    animate={{ rotate: isOpen ? 90 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ChevronRightIcon className="size-3 text-gray-500" />
                </motion.div>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.section
                        key="content"
                        animate="open"
                        className="overflow-hidden space-y-3"
                        exit="collapsed"
                        initial="collapsed"
                        transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                        variants={{
                            open: { opacity: 1, height: "auto" },
                            collapsed: { opacity: 0, height: 0 },
                        }}
                    >
                        {children}
                    </motion.section>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AccordionItem;

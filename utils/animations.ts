import { MotionProps } from "framer-motion";

export const sectionAnimationProps: MotionProps = {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: 'auto' },
    exit: { opacity: 0, height: 0 },
    transition: { type: "spring", stiffness: 300, damping: 30 },
};

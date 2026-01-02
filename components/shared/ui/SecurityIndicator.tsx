import {AnimatePresence, motion} from "framer-motion";
import React, {useState} from "react";

import Switcher from "@/components/shared/ui/Switcher";
import IndicatorsSection from "@/components/shared/ui/IndicatorsSection";
import {IndicatorItem} from "@/components/shared/ui/IndicatorRow";
import {sectionAnimationProps} from "@/utils/animations";


export default function SecurityIndicator({
    onChange,
}: {
    onChange: (list: IndicatorItem[]) => void;
}) {

    const [securityIndicatorEnabled, setSecurityIndicatorEnabled] = useState(true);

    return (
        <motion.div layout className="flex flex-col mb-6">
            <Switcher
                isEnabled={securityIndicatorEnabled}
                setIsEnabled={setSecurityIndicatorEnabled}
                title="Security Indicator"
            />
            <AnimatePresence initial={false}>
                {securityIndicatorEnabled && (
                    <motion.div {...sectionAnimationProps} className="pt-2">
                        <IndicatorsSection
                            onChange={onChange}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

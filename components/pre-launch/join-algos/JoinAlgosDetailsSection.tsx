import {useState} from "react";

import LabeledInput from "@/components/pre-launch/shared/ui/LabeledInput";
import {ArrowRight} from "@/utils/icons";

export default function JoinAlgosDetailsSection ({onProcess}: {onProcess: () => void}) {

    const [algorithmName, setAlgorithmName] = useState<string>('');
    const [algorithmPrompt, setAlgorithmPrompt] = useState<string>('');

    const isButtonDisabled = !algorithmName || !algorithmPrompt;

    const handleProcess = () => {
        if (!isButtonDisabled) {
            onProcess()
        }
    }

    return (
        <>
            <h3 className="block text-[#030303] font-semibold text-2xl text-center pb-6">Enter your algorithm information</h3>
            <LabeledInput
                id="name"
                name="prompt-title"
                placeholder="Enter your algorithm name"
                title="Algorithm name"
                value={algorithmName}
                onChange={(e) => setAlgorithmName(e.target.value)}
            />
            <LabeledInput
                id="propmt"
                name="propmt-text"
                placeholder="Write your algorithm..."
                title="Algorithm prompt"
                type="textarea"
                value={algorithmPrompt}
                onChange={(e) => setAlgorithmPrompt(e.target.value)}
            />
            <button
                className={`flex items-center justify-center gap-2 ${isButtonDisabled ? 'text-[#98979A] bg-[#E3E3E4]' : 'bg-[#030303] text-white'} rounded-3xl w-full h-[48px] text-sm`}
                disabled={isButtonDisabled}
                type="button"
                onClick={handleProcess}
            >
                <span>Continue</span>
                <ArrowRight className="size-4 stroke-2" />
            </button>
        </>
    )
}

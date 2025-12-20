import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";

import LabeledInput from "@/components/pre-launch/shared/ui/LabeledInput";
import {ArrowRight} from "lucide-react";

// Ideally, import this type from a shared types file
type FormValues = {
    promptTitle: string;
    promptText: string;
    name: string;
    nickname: string;
    email: string;
    avatar: string;
    agreement: boolean;
};

interface JoinAlgosDetailsSectionProps {
    onProcess: () => void;
    register: UseFormRegister<FormValues>;
    errors: FieldErrors<FormValues>;
    isValid: boolean;
}

export default function JoinAlgosDetailsSection({
    onProcess,
    register,
    errors,
    isValid
}: JoinAlgosDetailsSectionProps) {

    return (
        <>
            <h3 className="block text-[#030303] font-semibold text-2xl text-center pb-6">
                Enter your algorithm information
            </h3>

            <LabeledInput
                id="name"
                {...register("promptTitle", { required: "Algorithm name is required" })}
                error={errors.promptTitle?.message}
                placeholder="Enter your algorithm name"
                title="Algorithm name"
            />

            <LabeledInput
                id="prompt"
                type="textarea"
                {...register("promptText", {
                    required: "Prompt is required",
                    minLength: {
                        value: 20,
                        message: "Prompt must be at least 20 characters"
                    }
                })}
                error={errors.promptText?.message}
                placeholder="Write your algorithm..."
                title="Algorithm prompt"
            />

            <button
                className={`flex items-center justify-center gap-2 ${!isValid ? 'text-[#98979A] bg-[#E3E3E4]' : 'bg-[#030303] text-white'} rounded-3xl w-full h-[48px] text-sm transition-colors`}
                disabled={!isValid}
                type="button"
                onClick={onProcess}
            >
                <span>Continue</span>
                <ArrowRight className="size-4 stroke-2" />
            </button>
        </>
    );
}

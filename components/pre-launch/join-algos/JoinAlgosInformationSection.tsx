import React from "react";
import Link from "next/link";
// 1. Import Control and Controller
import {UseFormRegister, UseFormSetValue, FieldErrors, Control, Controller} from "react-hook-form";
import {addToast} from "@heroui/toast";

import LabeledInput from "@/components/pre-launch/shared/ui/LabeledInput";
import CustomCheckbox from "@/components/pre-launch/shared/ui/CustomCheckbox";
import UploadAvatar from "@/components/pre-launch/shared/ui/UploadAvatar";
import {ArrowRight} from "lucide-react";

// Re-defining for context
type FormValues = {
    promptTitle: string;
    promptText: string;
    name: string;
    nickname: string;
    email: string;
    avatar: string;
    agreement: boolean;
};

interface JoinAlgosInformationSectionProps {
    register: UseFormRegister<FormValues>,
    setValue: UseFormSetValue<FormValues>,
    control: Control<FormValues>,
    errors: FieldErrors<FormValues>,
    isValid: boolean,
    backToPrev: () => void,
    isLoading?: boolean,
}

export default function JoinAlgosInformationSection({
    register,
    setValue,
    control,
    errors,
    isValid,
    backToPrev,
    isLoading,
}: JoinAlgosInformationSectionProps) {

    const handleImageSelect = (file: File) => {
        setValue("avatar", file.name, {shouldValidate: true, shouldDirty: true});
        addToast({title: `Selected: ${file.name}`, color: "success"});
    };

    return (
        <>
            <h3 className="block text-[#030303] font-semibold text-2xl text-center pb-6">
                Enter your information
            </h3>

            <UploadAvatar onImageSelect={handleImageSelect}/>
            <input type="hidden" {...register("avatar")} />

            <LabeledInput
                id="name"
                placeholder="Enter your name"
                title="Your name"
                {...register("name", {required: "Name is required"})}
                error={errors.name?.message}
            />

            <LabeledInput
                id="nickname"
                placeholder="Enter your nickname"
                title="Your nickname"
                {...register("nickname", {required: "Nickname is required"})}
                error={errors.nickname?.message}
            />

            <LabeledInput
                id="email"
                placeholder="Enter your email"
                title="Your email"
                type="email"
                {...register("email", {
                    required: "Email is required",
                    pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address"
                    }
                })}
                error={errors.email?.message}
            />

            <div className="flex flex-col gap-1 w-full">
                <div className="flex items-start justify-start gap-2 w-full">

                    {/* Use Controller for custom visual components.
                        It manages the state (field.value) and passes it to your checked prop.
                    */}
                    <Controller
                        control={control}
                        name="agreement"
                        render={({field: {onChange, value, ref, name, onBlur}}) => (
                            <CustomCheckbox
                                ref={ref}
                                checked={value}
                                className="mt-1"
                                id="agreement"
                                name={name}
                                onBlur={onBlur}
                                onCheckedChange={(checked) => onChange(checked)}
                            />
                        )}
                        rules={{required: "You must accept the terms"}}
                    />

                    <label className="text-[#757575] text-xs text-start leading-5 cursor-pointer" htmlFor="agreement">
                        I agree to the
                        <Link className="text-[#030303] underline mx-1" href="/" target="_blank">
                            Terms and Conditions
                        </Link>
                        and understand that my algorithm will be evaluated for inclusion on the leaderboard based on its
                        merit and innovation.
                    </label>
                </div>
                {errors.agreement && (
                    <span className="text-xs text-red-500">{errors.agreement.message}</span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                    className="flex items-center justify-center gap-2 border border-[#030303] text-[#030303] rounded-3xl w-full h-12 text-sm hover:bg-gray-50 transition-colors"
                    type="button"
                    onClick={backToPrev}
                >
                    <ArrowRight className="size-4 stroke-2 rotate-180"/>
                    <span>Back</span>
                </button>
                <button
                    className={`flex items-center justify-center gap-2 ${!isValid || isLoading ? 'text-[#98979A] bg-[#E3E3E4]' : 'bg-[#030303] text-white'} rounded-3xl w-full h-12 text-sm transition-colors`}
                    disabled={!isValid || isLoading}
                    type="submit"
                >
                    {isLoading ? "Submitting..." : "Submit algos"}
                </button>
            </div>
        </>
    );
}

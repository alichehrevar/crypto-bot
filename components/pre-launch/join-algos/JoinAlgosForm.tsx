'use client'

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, SubmitHandler } from "react-hook-form";
import {addToast} from "@heroui/react";

import JoinAlgosDetailsSection from "@/components/pre-launch/join-algos/JoinAlgosDetailsSection";
import JoinAlgosInformationSection from "@/components/pre-launch/join-algos/JoinAlgosInformationSection";
import SuccessfulSubmission from "@/components/pre-launch/join-algos/SuccesssfulSubmission";
import {sendRequest} from "@/actions/post";
import {LeaderboardJoin} from "@/types/preLaunch/Leaderboard";

// Animation configuration
const formVariants = {
    hidden: { opacity: 0, x: 10 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 }
};

type FormValues = {
    promptTitle: string;
    promptText: string;
    name: string;
    nickname: string;
    email: string;
    avatar: string;
    agreement: boolean;
};

export default function JoinAlgosForm() {

    const [step, setStep] = useState(1);
    const [email, setEmail] = useState<string>('')
    const [formLoading, setFormLoading] = useState<boolean>(false)

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors, isValid }
    } = useForm<FormValues>({
        mode: "onChange",
        defaultValues: {
            promptTitle: '',
            promptText: '',
            name: '',
            nickname: '',
            email: '',
            agreement: false
        }
    });

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        setFormLoading(true);
        try {
            const response: LeaderboardJoin = await sendRequest(data, '/leaderboard/join');

            if (response.success) {
                setEmail(data.email)
                setStep(3)
            } else {
                addToast({
                    title: response.error,
                    color: 'danger'
                })
            }
        } catch {
            addToast({
                title: 'Something went wrong',
                color: 'danger'
            })
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <form className="w-full max-w-[500px] space-y-5 pb-10" onSubmit={handleSubmit(onSubmit)}>
            {/* --- Stepper Header --- */}
            {step !== 3 &&
                <div className="flex items-center justify-center mb-6">
                    {/* Step 1 */}
                    <div className="flex items-center text-[#030303]">
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full ${step === 1 ? 'border border-[#030303] text-[#030303]' : 'bg-[#030303] text-white'} text-xs mr-2 transition-colors duration-300`}>
                        1
                    </span>
                        <span className="text-sm">Algorithm details</span>
                    </div>

                    {/* Separator */}
                    <span className={`mx-4 transition-colors duration-300 ${step === 1 ? 'text-[#C4C4C4]' : 'text-[#030303]'}`}>
                    <svg className="h-5 w-5" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="m9 18 6-6-6-6" /></svg>
                </span>

                    {/* Step 2 */}
                    <div className={`flex items-center transition-colors duration-300 ${step === 2 ? 'text-[#030303]' : 'text-[#C4C4C4]'}`}>
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full ${step === 2 ? 'border border-[#030303] text-[#030303]' : 'bg-[#EDEDED] text-[#C4C4C4]'} text-xs mr-2 transition-colors duration-300`}>
                        2
                    </span>
                        <span className="text-sm">Your Information</span>
                    </div>
                </div>
            }

            {/* --- Animated Form Content --- */}
            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        animate="visible"
                        className="space-y-5"
                        exit="exit"
                        initial="hidden"
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        variants={formVariants}
                    >
                        <JoinAlgosDetailsSection
                            errors={errors}
                            isValid={isValid}
                            register={register}
                            onProcess={() => setStep(2)}
                        />
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step2"
                        animate="visible"
                        className="space-y-5"
                        exit="exit"
                        initial="hidden"
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        variants={formVariants}
                    >
                        <JoinAlgosInformationSection
                            backToPrev={() => setStep(1)}
                            control={control}
                            errors={errors}
                            isLoading={formLoading}
                            isValid={isValid}
                            register={register}
                            setValue={setValue}
                        />
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        key="step3"
                        animate="visible"
                        className="space-y-5"
                        exit="exit"
                        initial="hidden"
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        variants={formVariants}
                    >
                        <SuccessfulSubmission
                            backToFirst={() => setStep(1)}
                            email={email}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </form>
    )
}

"use client";

import React, {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {
    Button,
    Input,
    Checkbox,
    addToast
} from "@heroui/react";
import {ArrowLeftIcon} from "@heroui/shared-icons";

import {AppleIcon} from "@/utils/icons";
import ProfileSetupForm from "@/components/auth/ProfileSetupForm";
import OTPConfirmationForm from "@/components/auth/OTPConfirmationForm";
import {sendRequest} from "@/actions/post";
import {AuthResponse, checkEmailExistenceResponse, OtpVerification} from "@/types/auth";
import {siteConfig} from "@/config/site";

const Register = () => {

    const router = useRouter();

    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const handleStepTransition = (nextStep: number) => {
        setIsTransitioning(true);
        setTimeout(() => {
            setStep(nextStep);
            setIsTransitioning(false);
        }, 150);
    };

    const handleFirstStep = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate passwords match
        if (password !== repeatPassword) {
            addToast({
                title: "Passwords do not match",
                color: "danger"
            });

            return;
        }

        if (!agreeTerms) {
            addToast({
                title: "Please agree to the terms and conditions",
                color: "danger"
            });

            return;
        }

        setIsLoading(true);
        checkEmailExistence()
            .then((res: checkEmailExistenceResponse) => {
                if (res.success && res.exists) {
                    addToast({
                        title: "Email already exists",
                        description: "Please log in to continue",
                        color: "danger"
                    });
                } else if (res.success && !res.exists) {
                    handleStepTransition(2);
                } else {
                    addToast({
                        title: res.error,
                        color: "danger"
                    });
                }
            })
            .catch(() => {
                addToast({
                    title: "Something went wrong",
                    description: "Please, try again later",
                    color: "danger"
                });
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const checkEmailExistence = async () => {
        return await sendRequest({
            email: email
        }, "/auth/check-email-existence");
    };

    const register = async (data: { [p: string]: File | string }) => {
        return await sendRequest(data, "/auth/register");
    };

    const handleProfileSetup = (data: {
        firstName: string,
        lastName: string,
        birthday: string,
        phoneCountry: string,
        phoneNumber: string
    }) => {
        register({
            email,
            password,
            firstName: data.firstName,
            lastName: data.lastName,
            birthday: data.birthday,
            phoneCountry: data.phoneCountry,
            phoneNumber: data.phoneNumber
        })
            .then((res: AuthResponse) => {
                if (res.success) {
                    addToast({
                        title: res.message,
                        color: "success"
                    })
                } else if (!res.success) {
                    addToast({
                        title: res.error,
                        color: "danger"
                    });
                }
            })
            .catch(() => {
                addToast({
                    title: "Something went wrong",
                    description: "Please, try again later",
                    color: "danger"
                });
            })
        handleStepTransition(3);
    };

    const handleOTPConfirmation = async (otp: string) => {
        const response: OtpVerification = await sendRequest({
            email: email,
            otp: otp
        }, '/auth/verify-otp');

        if (response.success) {
            addToast({
                title: "Registration successful !",
                description: `Welcome to ${siteConfig.name} !`,
                color: "success"
            });
            router.push('/dashboard');
        } else {
            addToast({
                title: response.error,
                color: "danger"
            });
        }
    };

    const handleBackToFirstStep = () => {
        handleStepTransition(1);
    };

    const handleBackToProfileStep = () => {
        handleStepTransition(2);
    };

    const getStepTitle = () => {
        switch (step) {
            case 1:
                return "Register";
            case 2:
                return "Complete Profile";
            case 3:
                return "Verify Account";
            default:
                return "Register";
        }
    };

    return (
        <>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    {(step === 2 || step === 3) && (
                        <button
                            className="text-white hover:text-gray-300 transition-colors"
                            type="button"
                            onClick={step === 2 ? handleBackToFirstStep : handleBackToProfileStep}
                        >
                            <ArrowLeftIcon className="h-6 w-6"/>
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-white">
                        {getStepTitle()}
                    </h1>
                </div>
                <div className="text-white text-sm">
                    Step {step} of 3
                </div>
            </div>

            <div
                className={`transition-all duration-300 ${isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}>
                {step === 1 ? (
                    <form className="space-y-6" onSubmit={handleFirstStep}>
                        <div className="space-y-2">
                            <label className="text-white font-bold text-sm" htmlFor="email">Email</label>
                            <Input
                                required
                                className="border-gray-300 text-black placeholder:text-gray-500"
                                id="email"
                                placeholder="Enter your Email"
                                size="md"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-white font-bold text-sm" htmlFor="password">Password</label>
                            <Input
                                required
                                className="rounded-lg text-black placeholder:text-gray-500"
                                id="password"
                                placeholder="Enter your Password"
                                size="md"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-white font-bold text-sm" htmlFor="repeatPassword">Repeat
                                Password</label>
                            <Input
                                required
                                className="border-gray-300 text-black placeholder:text-gray-500 text-sm"
                                id="repeatPassword"
                                placeholder="Repeat your Password"
                                size="md"
                                type="password"
                                value={repeatPassword}
                                onChange={(e) => setRepeatPassword(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center space-x-1">
                            <Checkbox
                                className="border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                                color={"default"}
                                id="terms"
                                isSelected={agreeTerms}
                                onValueChange={setAgreeTerms}
                            >
                                <label className="text-white text-sm" htmlFor="terms">
                                    I agree to the{" "}
                                </label>
                            </Checkbox>
                            <Link className="hover:underline font-medium text-sm" href="/terms" target="_blank">
                                Terms and Conditions
                            </Link>
                        </div>

                        <Button
                            className="w-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-black transition-colors"
                            disabled={isLoading}
                            isLoading={isLoading}
                            type="submit"
                        >
                            Next
                        </Button>

                        <div className="text-center text-white text-sm">
                            Already have an Account?{" "}
                            <Link className="hover:underline font-medium" href="/login">
                                Login
                            </Link>
                        </div>

                        {/* Social Login Icons */}
                        <div className="flex justify-center space-x-4 pt-4">
                            <button
                                className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                                type="button"
                            >
                                <span className="text-white text-lg font-bold">G</span>
                            </button>
                            <button
                                className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                                type="button"
                            >
                                <span className="text-white text-lg font-bold">X</span>
                            </button>
                            <button
                                className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                                type="button"
                            >
                                <span className="text-white text-lg">
                                  <AppleIcon className="size-5 mt-[-2px]"/>
                                </span>
                            </button>
                            <button
                                className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                                type="button"
                            >
                                <span className="text-white text-lg">f</span>
                            </button>
                        </div>
                    </form>
                ) : step === 2 ? (
                    <ProfileSetupForm
                        onBack={handleBackToFirstStep}
                        onSubmit={handleProfileSetup}
                    />
                ) : (
                    <OTPConfirmationForm
                        onBack={handleBackToProfileStep}
                        onSubmit={handleOTPConfirmation}
                    />
                )}
            </div>
        </>
    );
};

export default Register;

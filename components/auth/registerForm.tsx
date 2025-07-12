"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Checkbox,
  addToast
} from "@heroui/react";
import { AppleIcon } from "@/utils/icons";
import { ArrowLeftIcon } from "@heroui/shared-icons";
import ProfileSetupForm from "@/components/auth/ProfileSetupForm";
import OTPConfirmationForm from "@/components/auth/OTPConfirmationForm";
import { sendRequest } from "@/actions/post";
import { AuthResponse, checkEmailExistenceResponse } from "@/types/auth";

const Register = () => {

  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
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

    console.log("First step completed:", { email, password, repeatPassword, agreeTerms });
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

  const handleProfileSetup = (data: any) => {
    console.log("Profile setup completed:", data);
    setProfileData(data);
    handleStepTransition(3);
  };

  const handleOTPConfirmation = (otp: string) => {
    console.log("Registration completed:", {
      email,
      password,
      ...profileData,
      otp
    });

    register({
      email,
      password,
      ...profileData,
      otp
    })
      .then((res: AuthResponse) => {
        if (res.success) {
          addToast({
            title: "Registration successful !",
            description: "Welcome to TradingX !",
            color: "success"
          });
          router.push("/dashboard");
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
              type="button"
              onClick={step === 2 ? handleBackToFirstStep : handleBackToProfileStep}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
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
          <form onSubmit={handleFirstStep} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-white font-bold text-sm">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your Email"
                value={email}
                size="md"
                onChange={(e) => setEmail(e.target.value)}
                className="border-gray-300 text-black placeholder:text-gray-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-white font-bold text-sm">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your Password"
                value={password}
                size="md"
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-2xl text-black placeholder:text-gray-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="repeatPassword" className="text-white font-bold text-sm">Repeat Password</label>
              <Input
                id="repeatPassword"
                type="password"
                placeholder="Repeat your Password"
                value={repeatPassword}
                size="md"
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="border-gray-300 text-black placeholder:text-gray-500 text-sm"
                required
              />
            </div>

            <div className="flex items-center space-x-1">
              <Checkbox
                id="terms"
                isSelected={agreeTerms}
                onValueChange={setAgreeTerms}
                color={"default"}
                className="border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
              >
                <label htmlFor="terms" className="text-white text-sm">
                  I agree to the{" "}
                </label>
              </Checkbox>
              <Link href="/terms" className="hover:underline font-medium text-sm" target="_blank">
                Terms and Conditions
              </Link>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              disabled={isLoading}
              className="w-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-black transition-colors"
            >
              Next
            </Button>

            <div className="text-center text-white text-sm">
              Already have an Account?{" "}
              <Link href="/login" className="hover:underline font-medium">
                Login
              </Link>
            </div>

            {/* Social Login Icons */}
            <div className="flex justify-center space-x-4 pt-4">
              <button
                type="button"
                className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <span className="text-white text-lg font-bold">G</span>
              </button>
              <button
                type="button"
                className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <span className="text-white text-lg font-bold">X</span>
              </button>
              <button
                type="button"
                className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <span className="text-white text-lg">
                  <AppleIcon className="size-5 mt-[-2px]" />
                </span>
              </button>
              <button
                type="button"
                className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <span className="text-white text-lg">f</span>
              </button>
            </div>
          </form>
        ) : step === 2 ? (
          <ProfileSetupForm
            onSubmit={handleProfileSetup}
            onBack={handleBackToFirstStep}
          />
        ) : (
          <OTPConfirmationForm
            onSubmit={handleOTPConfirmation}
            onBack={handleBackToProfileStep}
          />
        )}
      </div>
    </>
  );
};

export default Register;

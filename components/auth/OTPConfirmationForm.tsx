import React, {useState} from 'react';
import {Button, InputOtp} from "@heroui/react";

interface OTPConfirmationFormProps {
    onSubmit: (otp: string) => void,
    onBack: () => void,
    buttonText?: 'Continue' | string,
    isLoading?: boolean
}

const OTPConfirmationForm = ({onSubmit, buttonText, isLoading}: OTPConfirmationFormProps) => {
    const [otp, setOtp] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length === 6) {
            onSubmit(otp);
        }
    };

    return (
        <div className="space-y-8">
            <div className="text-center">
                <p className="text-white/80 text-sm mb-4">
                    Enter the code sent to your Email
                </p>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="flex justify-center gap-16">
                        <InputOtp
                            classNames={{
                                segment: 'mx-1 border-1',
                            }}
                            length={6}
                            size="lg"
                            value={otp}
                            variant="bordered"
                            onValueChange={(value) => setOtp(value)}
                        />
                    </div>

                    <Button
                        className="w-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                        disabled={otp.length !== 6}
                        isLoading={isLoading}
                        type="submit"
                    >
                        {buttonText}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default OTPConfirmationForm;


import React, { useState } from 'react';
import { Button, InputOtp } from "@heroui/react";

interface OTPConfirmationFormProps {
  onSubmit: (otp: string) => void;
  onBack: () => void;
}

const OTPConfirmationForm = ({ onSubmit, onBack }: OTPConfirmationFormProps) => {
  const [otp, setOtp] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 4) {
      onSubmit(otp);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-white/80 text-sm mb-4">
          Enter the code sent to your E-mail
        </p>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="flex justify-center gap-16">
            <InputOtp
              classNames={{
                segment: 'mx-1'
              }}
              length={4}
              size="lg"
              value={otp}
              onValueChange={(value) => setOtp(value)}
             />
          </div>

          <Button
            className="w-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
            disabled={otp.length !== 4}
            type="submit"
          >
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
};

export default OTPConfirmationForm;

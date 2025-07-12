import React from 'react';

import RegisterForm from "@/components/auth/registerForm";

const Register = () => {

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/images/auth/auth-bg-nature.webp')`
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Register Form */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-black/60 backdrop-blur-sm p-8 rounded-lg border border-gray-700/50">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
};

export default Register;

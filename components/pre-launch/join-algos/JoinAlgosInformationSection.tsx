import React, {useState} from "react";
import Link from "next/link";

import LabeledInput from "@/components/pre-launch/shared/ui/LabeledInput";
import {ArrowRight} from "@/utils/icons";
import CustomCheckbox from "@/components/pre-launch/shared/ui/CustomCheckbox";
import UploadAvatar from "@/components/pre-launch/shared/ui/UploadAvatar";

export default function JoinAlgosInformationSection ({onProcess, backToPrev}: {onProcess: () => void, backToPrev: () => void}) {

    const [name, setName] = useState<string>('');
    const [nickname, setNickname] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [avatar, setAvatar] = useState<string>('');
    const [agreement, setAgreement] = useState<boolean>(false);

    const isButtonDisabled = !name || !nickname || !email || !agreement;

    const handleProcess = () => {
        if (!isButtonDisabled) {
            onProcess()
        }
    }

    const handleImageSelect = (file: File) => {
        console.log("Selected file:", file.name);
        setAvatar(file.name)
    };

    return (
        <>
            <h3 className="block text-[#030303] font-semibold text-2xl text-center pb-6">Enter your information</h3>
            <UploadAvatar
                onImageSelect={handleImageSelect}
            />
            <LabeledInput
                id="name"
                name="name"
                placeholder="Enter your name"
                title="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <LabeledInput
                id="nickname"
                name="nickname"
                placeholder="Enter your nickname"
                title="Your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
            />
            <LabeledInput
                id="email"
                name="email"
                placeholder="Enter your email"
                title="Your email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <div className="flex items-start justify-start gap-2 w-full">
                <CustomCheckbox
                    checked={agreement}
                    className="mt-1"
                    id="agreement"
                    onChange={() => setAgreement(!agreement)}
                />
                <label className="text-[#757575] text-xs text-start leading-5 cursor-pointer" htmlFor="agreement">
                    I agree to the
                    <Link className="text-[#030303] underline mx-1" href="/" target="_blank">Terms and Conditions</Link>
                    and understand that my algorithm will be evaluated for inclusion on the leaderboard based on its merit and innovation.
                </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <button
                    className={`flex items-center justify-center gap-2 border-1 border-[#030303] text-[#030303] rounded-3xl w-full h-[48px] text-sm`}
                    type="button"
                    onClick={backToPrev}
                >
                    <ArrowRight className="size-4 stroke-2 rotate-180" />
                    <span>Back</span>
                </button>
                <button
                    className={`flex items-center justify-center gap-2 ${isButtonDisabled ? 'text-[#98979A] bg-[#E3E3E4]' : 'bg-[#030303] text-white'} rounded-3xl w-full h-[48px] text-sm`}
                    disabled={isButtonDisabled}
                    type="button"
                    onClick={handleProcess}
                >
                    <span>Submit algos</span>
                </button>
            </div>
        </>
    )
}

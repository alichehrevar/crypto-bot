import React, {useState} from "react";
import {addToast, Modal, ModalBody, ModalContent, ModalHeader, useDisclosure} from "@heroui/react";

import Switcher from "@/components/shared/ui/Switcher";
import OTPConfirmationForm from "@/components/auth/OTPConfirmationForm";
import {Toggle2faResponse} from "@/types/auth";
import {sendRequest} from "@/actions/post";
import {siteConfig} from "@/config/site";

export default function Enable2FAModal() {

    const {isOpen, onOpen, onOpenChange} = useDisclosure();
    const [securityIndicatorEnabled, setSecurityIndicatorEnabled] = useState(true);

    const sendOTP = async () => {
        try {
            const response = sendRequest({},'/send-otp')
        } catch {
            addToast({
                title: "Something went wrong !",
                description: "Please try again later.",
                color: "danger"
            })
        }
    }

    const handleOTPConfirmation = async (otp: string) => {
        try {
            const response: Toggle2faResponse = await sendRequest({
                otp: otp
            }, '/auth/verify-otp');

            if (response.success) {
                addToast({
                    title: "Registration successful !",
                    description: `Welcome to ${siteConfig.name} !`,
                    color: "success"
                });
            } else {
                addToast({
                    title: response.message,
                    color: "danger"
                });
            }
        } catch {
            addToast({
                title: "Something went wrong !",
                description: "Please try again later.",
                color: "danger"
            })
        }
    }

    return (
        <>
            <Switcher
                isEnabled={securityIndicatorEnabled}
                setIsEnabled={onOpen}
            />
            <Modal
                backdrop="opaque"
                isDismissable={true}
                isKeyboardDismissDisabled={false}
                isOpen={isOpen}
                onOpenChange={onOpenChange}
            >
                <ModalContent>
                    {() => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Enable / Disable 2FA</ModalHeader>
                            <ModalBody className="pb-5">
                                <OTPConfirmationForm
                                    onBack={() => {}}
                                    onSubmit={handleOTPConfirmation}
                                />
                            </ModalBody>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    )
}

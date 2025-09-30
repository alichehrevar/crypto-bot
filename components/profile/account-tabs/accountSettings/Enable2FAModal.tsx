import React, {useEffect, useState} from "react";
import {addToast, Modal, ModalBody, ModalContent, ModalHeader, useDisclosure} from "@heroui/react";

import Switcher from "@/components/shared/ui/Switcher";
import OTPConfirmationForm from "@/components/auth/OTPConfirmationForm";
import {Toggle2faResponse} from "@/types/auth";
import {sendRequest} from "@/actions/post";

interface Enable2FAModalProps {
    isEnabled: boolean
}

export default function Enable2FAModal({isEnabled}: Enable2FAModalProps) {

    const {isOpen, onOpen, onOpenChange} = useDisclosure();
    const [securityIndicatorEnabled, setSecurityIndicatorEnabled] = useState<boolean>(isEnabled);
    const [isLoading, setIsLoading] = useState(false);

    async function sendOtp() {
        return await sendRequest({}, '/user/2fa/toggle')
    }

    useEffect(() => {
        if (isOpen) {
            try {
                sendOtp()
                    .then((response: Toggle2faResponse) => {
                        addToast({
                            title: response.message,
                            color: response.success ? 'success' : 'warning'
                        })
                    })
            } catch {
                addToast({
                    title: "Something went wrong !",
                    description: "Please try again later.",
                    color: "danger"
                })
            }
        }
    }, [isOpen])

    const handleOTPConfirmation = async (otp: string) => {
        setIsLoading(true)
        try {
            const response: Toggle2faResponse = await sendRequest({
                otp: otp
            }, '/user/2fa/toggle');

            addToast({
                title: response.message,
                color: response.success ? 'success' : 'warning'
            })

            if (response.success) {
                onOpenChange()
                setSecurityIndicatorEnabled(response.isEnabled)
            }
        } catch {
            addToast({
                title: "Something went wrong !",
                description: "Please try again later.",
                color: "danger"
            })
        } finally {
            setIsLoading(false)
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
                                    buttonText={isLoading ? 'Submitting...' : 'Submit'}
                                    isLoading={isLoading}
                                    onBack={() => {
                                    }}
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

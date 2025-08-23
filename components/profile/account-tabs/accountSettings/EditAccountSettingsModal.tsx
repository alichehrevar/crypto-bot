import React from "react";
import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    useDisclosure,
} from "@heroui/react";

import {User} from "@/types/UserType";
import EditSecurityForm from "@/components/profile/account-tabs/accountSettings/EditSecurityForm";
import EditDetailsModal from "@/components/profile/account-tabs/accountSettings/EditDetailsForm";

export default function EditAccountSettingsModal(props: {userData: User | null, title: string, type: string}) {

    const {isOpen, onOpen, onOpenChange} = useDisclosure();

    return (
        <>
            <Button onPress={onOpen}>
                <svg className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5"
                     viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                        strokeLinecap="round"
                        strokeLinejoin="round"/>
                </svg>
                <span className="text-[13px]">Edit</span>
            </Button>
            <Modal
                backdrop="opaque"
                isDismissable={true}
                isKeyboardDismissDisabled={false}
                isOpen={isOpen}
                onOpenChange={onOpenChange}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                {props.title}
                            </ModalHeader>
                            <ModalBody className="pb-5">
                                {props.type === 'account' && <EditDetailsModal userData={props.userData} onClose={onClose} />}
                                {props.type === 'security' && <EditSecurityForm userData={props.userData} onClose={onClose}/>}
                            </ModalBody>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    )
}

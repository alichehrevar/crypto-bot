import React, {FormEvent} from "react";
import {
    addToast,
    Button, DateInput,
    Form,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    useDisclosure,
} from "@heroui/react";
import {CalendarDate} from "@internationalized/date";

import LabelTag from "@/components/shared/ui/Label";
import {User, UserResponse} from "@/types/UserType";
import {updateRequest} from "@/actions/put";

export default function EditDetailsModal(props: {userData: User | null}) {

    const {isOpen, onOpen, onOpenChange} = useDisclosure();

    const [formLoading, setFormLoading] = React.useState(false);

    async function handleSubmission (event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormLoading(true)
        const formData = Object.fromEntries(new FormData(event.currentTarget));

        try {
            const response: UserResponse = await updateRequest(formData,'/user/info/update')

            addToast({
                title: response.message,
                color: response.success ? 'success' : 'danger',
            })
        } catch {
            addToast({
                title: "Something went wrong !",
                description: 'Please try again later',
                color: "danger",
            })
        } finally {
            setFormLoading(false)
            onOpenChange()
        }
    }

    let birthday= '1/1/1990';

    if (props.userData?.info?.birthday) {
        birthday = new Date(props.userData.info.birthday).toLocaleDateString()
    }

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
                            <ModalHeader className="flex flex-col gap-1">Edit Account Details</ModalHeader>
                            <ModalBody className="pb-5">
                                <Form className="w-full space-y-2" onSubmit={handleSubmission}>
                                    <div className="grid grid-cols-2 w-full gap-2">
                                        <div className="space-y-2 w-full">
                                            <LabelTag id="firstName" title="First Name" />
                                            <Input
                                                required
                                                className="rounded-lg text-black placeholder:text-gray-500"
                                                defaultValue={props.userData?.info?.firstName}
                                                id="firstName"
                                                name="firstName"
                                                type="text"
                                            />
                                        </div>
                                        <div className="space-y-2 w-full">
                                            <LabelTag id="lastName" title="Last Name" />
                                            <Input
                                                required
                                                className="rounded-lg text-black placeholder:text-gray-500"
                                                defaultValue={props.userData?.info?.lastName}
                                                id="lastName"
                                                name="lastName"
                                                type="text"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 w-full">
                                        <LabelTag id="phone-number" title="Birthday" />
                                        <div className="flex gap-2">
                                            <DateInput
                                                isRequired
                                                defaultValue={new CalendarDate(Number(birthday.split('/')[2]), Number(birthday.split('/')[1]), Number(birthday.split('/')[0]))}
                                                hideTimeZone={true}
                                                name="birthday"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end w-full gap-2">
                                        <Button
                                            className="border-1.5"
                                            size="sm"
                                            type="button"
                                            variant="bordered"
                                            onPress={onClose}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            className="border-1 border-[var(--chart-green)] text-[var(--text-green)]"
                                            isLoading={formLoading}
                                            size="sm"
                                            type="submit"
                                            variant="bordered"
                                        >
                                            Submit
                                        </Button>
                                    </div>
                                </Form>
                            </ModalBody>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    )
}

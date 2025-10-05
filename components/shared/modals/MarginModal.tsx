import React from "react";
import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    useDisclosure,
    RadioGroup,
    Radio,
    cn
} from "@heroui/react";

export const CustomRadio = (props: any) => {
    const {children, ...otherProps} = props;

    return (
        <Radio
            {...otherProps}
            classNames={{
                base: cn(
                    "inline-flex m-0 bg-content1 hover:bg-content2 items-center justify-between border-gray-700",
                    "flex-row-reverse w-full cursor-pointer rounded-lg gap-4 p-4 border-2",
                    "data-[selected=true]:border-primary",
                ),
            }}
        >
            {children}
        </Radio>
    );
};


export default function MarginModal({selectedValue, onChange}: { selectedValue: string; onChange: (value: string) => void; }) {

    const {isOpen, onOpen, onOpenChange} = useDisclosure();

    return (
        <>
            <button className="text-[13px] font-semibold" onClick={onOpen}>
                <span>{selectedValue}</span>
            </button>
            <Modal
                backdrop="opaque"
                isDismissable={false}
                isKeyboardDismissDisabled={true}
                isOpen={isOpen}
                size="xl"
                onOpenChange={onOpenChange}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Select Margin Mode
                            </ModalHeader>
                            <ModalBody className="pt-5">
                                <RadioGroup
                                    className="w-full flex"
                                    classNames={{
                                        wrapper: 'gap-4'
                                    }}
                                    value={selectedValue}
                                    onValueChange={onChange}
                                >
                                    <CustomRadio
                                        description="In the cross margin mode, all positions of a particular asset share the same margin. In the event of forced liquidation, the trader may lose the entire margin of that particular asset and all positions sharing the same margin."
                                        value="Isolated"
                                    >
                                        Isolated
                                    </CustomRadio>
                                    <CustomRadio
                                        description="In the cross margin mode, all positions of a particular asset share the same margin. In the event of forced liquidation, the trader may lose the entire margin of that particular asset and all positions sharing the same margin."
                                        value="Cross"
                                    >
                                        Cross
                                    </CustomRadio>
                                </RadioGroup>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="primary" variant="bordered" onPress={onClose}>
                                    Confirm
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    )
}

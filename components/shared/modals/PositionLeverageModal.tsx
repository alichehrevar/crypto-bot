import React from "react";
import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    useDisclosure,
} from "@heroui/react";

import RadioGroup from "@/components/shared/ui/RadioGroup";
import Slider from "@/components/shared/ui/Slider";
import {ChevronRightIcon} from "@/utils/icons";


export default function PositionLeverageModal({
      positionMode,
      setPositionMode,
      singleModeSide,
      setSingleModeSide,
      leverageLong,
      setLeverageLong,
      leverageShort,
      setLeverageShort,
}: {
    positionMode: string;
    setPositionMode: (value: string) => void;
    singleModeSide: string;
    setSingleModeSide: (value: string) => void;
    leverageLong: number;
    setLeverageLong: (value: number) => void;
    leverageShort: number;
    setLeverageShort: (value: number) => void;
}) {

    const showLongLeverage = positionMode === 'Hedge' || (positionMode === 'Single' && (singleModeSide === 'Long' || singleModeSide === 'Both'));
    const showShortLeverage = positionMode === 'Hedge' || (positionMode === 'Single' && (singleModeSide === 'Short' || singleModeSide === 'Both'));
    const isDualLeverage = showLongLeverage && showShortLeverage;

    const {isOpen, onOpen, onOpenChange} = useDisclosure();

    return (
        <>
            <button className="text-[13px] font-semibold flex items-center gap-2" onClick={onOpen}>
                {(singleModeSide === 'Short' || singleModeSide === 'Both') &&
                    <span className="text-red-500">{leverageShort}x</span>
                }
                {(singleModeSide === 'Long' || singleModeSide === 'Both') &&
                    <span className="text-green-500">{leverageLong}x</span>
                }
                <ChevronRightIcon className="size-3" />
                <span>{positionMode}</span>
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-5">
                                        <RadioGroup
                                            label="Position"
                                            options={[{ value: 'Hedge', label: 'Hedge' }, { value: 'Single', label: 'Single' }]}
                                            selectedValue={positionMode}
                                            onChange={setPositionMode}
                                        />
                                    </div>
                                    <div className="flex flex-col justify-end">
                                        {positionMode === 'Single' &&
                                            (<RadioGroup
                                                label="Side"
                                                options={[{ value: 'Long', label: 'Long' }, { value: 'Short', label: 'Short' }, { value: 'Both', label: 'Both' }]}
                                                selectedValue={singleModeSide}
                                                onChange={setSingleModeSide}
                                            />)
                                        }
                                    </div>
                                </div>
                                <div className="relative h-[68px] overflow-hidden">
                                    <div className="transition-all duration-500 ease-in-out absolute" style={{ width: isDualLeverage ? 'calc(50% - 8px)' : '100%', transform: showLongLeverage ? 'translateX(0)' : 'translateX(-100%)', opacity: showLongLeverage ? 1 : 0 }}>
                                        <Slider colorClass="text-green-500" label="Leverage Long" value={leverageLong} onChange={setLeverageLong} />
                                    </div>
                                    <div className="transition-all duration-500 ease-in-out absolute" style={{ width: isDualLeverage ? 'calc(50% - 8px)' : '100%', right: 0, transform: showShortLeverage ? 'translateX(0)' : 'translateX(100%)', opacity: showShortLeverage ? 1 : 0 }}>
                                        <Slider colorClass="text-red-500" label="Leverage Short" value={leverageShort} onChange={setLeverageShort} />
                                    </div>
                                </div>
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

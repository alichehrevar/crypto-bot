import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  addToast,
} from "@heroui/react";

import { PauseIcon } from "@/utils/icons";
import { CloseTradeResponse } from "@/types/bots/DeployedBots";
import { deleteRequest } from "@/actions/delete";

export default function CloseBotModal(props: {botId: string;}) {

  const {isOpen, onOpen, onOpenChange} = useDisclosure();

  async function closeTrade () {
    try {
      const response: CloseTradeResponse = await deleteRequest({}, `/bots/${props.botId}`)

      if (response.success) {
        addToast({
          title: 'Bot paused successfully !',
          color: "success",
        });
      } else {
        addToast({
          title: response.error,
          description: 'Please try again later !',
          color: "danger",
        });
      }
    } catch (error) {
      let errorMessage = 'An unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      }
      addToast({
        title: errorMessage,
        description: 'Please try again later !',
        color: "danger",
      });
    }
    finally {
      onOpenChange()
    }
  }

  return (
    <>
      <button className="bg-default-100 hover:bg-default-300 px-4 lg:px-3 h-[40px] rounded-lg text-[13px]" onClick={onOpen}>
        <PauseIcon className="size-4 hidden lg:flex" />
        <span className="flex lg:hidden">Pause</span>
      </button>
      <Modal
        backdrop="opaque"
        isDismissable={false}
        isKeyboardDismissDisabled={true}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Confirm Action</ModalHeader>
              <ModalBody>
                <p>
                  Are you sure you want pause this bot?
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Never mind !
                </Button>
                <Button color="default" onPress={closeTrade}>
                  Yes, sure !
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

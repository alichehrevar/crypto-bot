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

import { XIcon } from "@/utils/icons";
import { sendRequest } from "@/actions/post";
import { CloseTradeResponse } from "@/types/profile/bots/DeployedBots";

export default function CloseTradeModal(props: {botId: string; tradeId: string}) {

  const {isOpen, onOpen, onOpenChange} = useDisclosure();

  async function closeTrade () {
    try {
      const response: CloseTradeResponse = await sendRequest({}, `/bots/${props.botId}/trades/${props.tradeId}/close`)

      if (response.success) {
        addToast({
          title: 'Trade closed successfully !',
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
      <button className="px-3 py-1.5 bg-default flex items-center gap-1 text-white rounded text-xs" onClick={onOpen}>
        <XIcon />
        Close
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
                  Are you sure you want close this trade?
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

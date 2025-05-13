'use client'

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
  Tabs,
  Tab
} from "@heroui/react";
import React from "react";

import DefaultDeployBotForm from "@/components/profile/bots/deploy/DefaultDeployBotForm";


export default function DeployBotModal ({
  children,
  onSuccessAction
}: {
  children: React.ReactNode;
  onSuccessAction: () => void
}) {

  const {isOpen, onOpen, onOpenChange} = useDisclosure();

  function closeModal() {
    onOpenChange()
    onSuccessAction()
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(); }}
      >
        { children }
      </div>
      <Modal
        backdrop={'blur'}
        isDismissable={false}
        isKeyboardDismissDisabled={true}
        isOpen={isOpen}
        scrollBehavior={'inside'}
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-xl font-bold mb-4">Deploy New Bot</h2>
              </ModalHeader>
              <ModalBody>
                <div className="flex w-full flex-col">
                  <Tabs
                    fullWidth
                    aria-label="Options"
                    classNames={{
                      cursor: "w-full bg-white dark:group-data-[selected=true]:bg-white",
                      tab: "h-10",
                      tabContent: "dark:group-data-[selected=true]:text-black",
                    }}
                    radius={'full'}
                  >
                    <Tab key="default" title="Default">
                      <DefaultDeployBotForm mode="default" onCloseAction={closeModal} />
                    </Tab>
                    <Tab key="optimized" title="Optimized">
                      <DefaultDeployBotForm mode="optimized" onCloseAction={closeModal} />
                    </Tab>
                    <Tab key="dynamic" title="dynamic" />
                  </Tabs>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}

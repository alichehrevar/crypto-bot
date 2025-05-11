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
}: {
  children: React.ReactNode;
}) {

  const {isOpen, onOpen, onOpenChange} = useDisclosure();

  return (
    <>
      <div onClick={onOpen}>
        { children }
      </div>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        scrollBehavior={'inside'}
        backdrop={'blur'}
        isDismissable={false}
        isKeyboardDismissDisabled={true}
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
                    aria-label="Options"
                    radius={'full'}
                    fullWidth
                    classNames={{
                      cursor: "w-full bg-white dark:group-data-[selected=true]:bg-white",
                      tab: "h-10",
                      tabContent: "dark:group-data-[selected=true]:text-black",
                    }}
                  >
                    <Tab key="default" title="Default">
                      <DefaultDeployBotForm onOpenChange={onOpenChange} />
                    </Tab>
                    <Tab key="optimized" title="Optimized">

                    </Tab>
                    <Tab key="dynamic" title="dynamic">
                    </Tab>
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
